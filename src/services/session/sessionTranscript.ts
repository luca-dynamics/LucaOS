import { apiUrl, getAuthHeaders, waitForAuth } from "../../config/api";
import {
  DEFAULT_CONTEXT_WINDOW_TOKENS,
  SUMMARY_MARKER,
  canStartHistoryAt,
  estimateMessageTokens,
  keepRecentTokensFor,
} from "../turns/contextCompactor";
import type { ChatMessage, ToolCall } from "../llm/LLMProvider";

/**
 * Renderer client for the durable session transcript.
 *
 * `lucaService.localHistory` is the only complete record of a conversation and it
 * has never been persisted — it dies with the renderer, and on restart `initChat`
 * rebuilds history from the Chroma vector index, which holds flat
 * `{text, sender}` pairs and cannot represent a turn. This client is the other
 * half of `cortex/server/services/sessionEntryStore.js`: every message also goes
 * to an append-only table on the core server, and boot reads it back with tool
 * structure intact.
 *
 * Two properties matter more than anything else here:
 *
 * 1. **It never interferes with a turn.** `append` is synchronous from the
 *    caller's side — it enqueues and returns. It does not await, does not throw,
 *    and a dead core server slows nothing down. A transcript that can break a
 *    turn is worse than no transcript.
 * 2. **It never pretends a write succeeded.** Failures are counted, surfaced on
 *    `status()`, published to `globalThis.__LUCA_TRANSCRIPT_STATUS` (the same
 *    idiom as `__LUCA_DB_STATUS` in db.js), and logged loudly once they persist.
 *    Silent degradation is the bug this file is careful not to reintroduce.
 *
 * Ordering is enforced by a single in-flight request: entries leave the queue in
 * the order they were appended, and a failed batch stays at the head rather than
 * letting later entries overtake it. Each entry carries a `clientId`, so the
 * store's `ON CONFLICT DO NOTHING` makes a retry idempotent.
 */

/** Roles the store accepts. `summary` is written after a context compaction. */
export type TranscriptRole = "user" | "model" | "tool" | "system" | "summary";

/** One entry as the caller describes it; ids and provenance are added here. */
export interface TranscriptEntry {
  role: TranscriptRole;
  content?: string;
  thought?: string;
  toolName?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

/** A queued entry, as sent to the server. */
interface QueuedEntry extends TranscriptEntry {
  clientId: string;
  surface: string;
  createdAt: number;
}

/** Session metadata as returned by `GET /api/session/current`. */
export interface TranscriptSession {
  id: string;
  title: string | null;
  status: string;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
}

/** One stored row as returned by `GET /api/session/:id/entries`. */
export interface TranscriptEntryRow {
  seq: number;
  parentSeq: number | null;
  role: TranscriptRole;
  content: string | null;
  thought: string | null;
  toolName: string | null;
  toolCallId: string | null;
  toolCalls: ToolCall[] | null;
  surface: string | null;
  schemaVersion: number;
  clientId: string | null;
  createdAt: number;
}

export interface TranscriptStatus {
  sessionId: string | null;
  /** Entries written locally but not yet acknowledged by the store. */
  pending: number;
  consecutiveFailures: number;
  /** Entries the store refused outright. Non-zero means a bug, not a retry. */
  rejected: number;
  /** True while writes are known to be failing and entries are backing up. */
  unpersisted: boolean;
  /** True when the server reports its own database is the non-persistent mock. */
  degraded: boolean;
  lastError: string | null;
}

/**
 * Where the status is published: somewhere a developer or a diagnostic panel can
 * look to see whether the transcript is actually landing, mirroring the
 * `globalThis.__LUCA_DB_STATUS` idiom in `db.js`.
 *
 * A `declare global { var … }` block is the tidier spelling, but under this
 * repo's `tsconfig` the augmentation does not attach to `typeof globalThis` —
 * `tsc` reports TS7017 at every read and write, meaning the property was
 * silently an implicit `any`, which is the untyped seam Invariant 6 rules out.
 * An explicit intersection keeps the type.
 */
type TranscriptStatusHost = typeof globalThis & {
  __LUCA_TRANSCRIPT_STATUS?: TranscriptStatus;
};

const statusHost = (): TranscriptStatusHost => globalThis as TranscriptStatusHost;

/**
 * The last published status, readable without holding a reference to the client
 * — for a diagnostic surface, or a test asserting the status is observable.
 */
export function publishedTranscriptStatus(): TranscriptStatus | undefined {
  return statusHost().__LUCA_TRANSCRIPT_STATUS;
}

/**
 * One request per tool round rather than per entry. Well above the handful of
 * entries a turn produces, so a healthy session always flushes in one call; the
 * cap only matters when a backlog drains after an outage.
 */
const FLUSH_BATCH_MAX = 64;

/** How many consecutive failures before the console gets loud about it. */
const LOUD_AFTER_FAILURES = 3;

/** After crossing the threshold, log every Nth failure instead of all of them. */
const LOUD_EVERY = 10;

/** Retry backoff, indexed by consecutive failure count and then held. */
const RETRY_DELAYS_MS = [500, 1_500, 4_000, 10_000, 30_000] as const;

/**
 * How many rows boot hydration asks for. A ceiling on the read, not on the
 * transcript: `maxTokens` is what actually decides how much comes back, and rows
 * beyond this are still on disk.
 */
export const HYDRATION_TAIL_ENTRIES = 400;

/**
 * Token budget for a hydrated history, deliberately equal to what compaction
 * would keep. Restoring exactly the keep-recent tail means the first turn after a
 * restart is already inside budget and never has to compact before it can run.
 * A caller that knows the model's real window can pass a larger `maxTokens`.
 */
export const HYDRATION_TOKEN_BUDGET = keepRecentTokensFor(
  DEFAULT_CONTEXT_WINDOW_TOKENS,
);

/** What a batch attempt concluded. */
type FlushOutcome = "ok" | "retry" | "rejected";

/**
 * Which surface wrote an entry — provenance, required of any durable state by
 * RFC-0004 and Invariant 8. Coarse on purpose: it answers "which body was Luca
 * in", which is the question a cross-surface handoff asks.
 *
 * Exported because the session lease records the same value, and two definitions
 * of "which body was Luca in" would drift apart.
 */
export function detectSurface(): string {
  if (typeof window === "undefined") return "node";
  return (window as { luca?: unknown }).luca ? "desktop" : "web";
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Best-effort error detail; a failed read of a failed response is not news. */
async function readErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 300);
  } catch {
    return "";
  }
}

/**
 * Map a stored row back to a provider-shaped message.
 *
 * `ChatMessage` has no `summary` role, and inventing one would mean touching
 * every adapter. A stored summary comes back as a `user` message wrapped in
 * `SUMMARY_MARKER` — byte-identical to what `compactHistory` produces — so
 * `extractPriorSummary` still finds it if the session compacts again after a
 * restart, and the beginning of the conversation is not lost twice.
 */
function toChatMessage(row: TranscriptEntryRow): ChatMessage {
  const content = row.content ?? "";
  if (row.role === "summary") {
    return { role: "user", content: `${SUMMARY_MARKER}\n${content}` };
  }

  const message: ChatMessage = { role: row.role, content };
  if (row.thought) message.thought = row.thought;
  if (row.toolCalls?.length) message.toolCalls = row.toolCalls;
  if (row.toolCallId) message.toolCallId = row.toolCallId;
  if (row.toolName) message.name = row.toolName;
  return message;
}

/** Extract the transcript shape of a message the turn loop already built. */
export function toTranscriptEntry(message: ChatMessage): TranscriptEntry {
  return {
    role: message.role,
    content: message.content ?? "",
    thought: message.thought,
    toolName: message.name,
    toolCallId: message.toolCallId,
    toolCalls: message.toolCalls,
  };
}

/**
 * Turn stored rows into a history the provider will accept.
 *
 * Three rules, in order:
 *
 * 1. **Start no earlier than the newest summary.** Everything before it is
 *    already described by it; replaying both would waste the window and tell the
 *    model the same thing twice.
 * 2. **Fit `maxTokens`,** walking back from the newest entry. A single entry
 *    larger than the whole budget is still kept — a truthful last turn beats an
 *    empty history.
 * 3. **Open on a legal boundary.** `canStartHistoryAt` is shared with compaction
 *    for exactly one reason: an orphaned tool result is a hard provider error, and
 *    hydration can produce one just as easily as a cut can. When the budgeted
 *    start is illegal we move *forward*, dropping more, never backward.
 *
 * Pure and exported so the rules are testable without a server.
 */
export function buildHistory(
  rows: readonly TranscriptEntryRow[],
  maxTokens: number = HYDRATION_TOKEN_BUDGET,
): ChatMessage[] {
  if (!rows.length) return [];

  const messages = rows.map(toChatMessage);

  let floor = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i]?.role === "summary") {
      floor = i;
      break;
    }
  }

  const newest = messages.length - 1;
  let tokens = 0;
  let start = messages.length;
  for (let i = newest; i >= floor; i--) {
    const cost = estimateMessageTokens(messages[i]);
    if (i < newest && tokens + cost > maxTokens) break;
    tokens += cost;
    start = i;
  }

  while (start < messages.length && !canStartHistoryAt(messages, start)) {
    start += 1;
  }

  return messages.slice(start);
}

class SessionTranscript {
  private sessionId: string | null = null;
  private sessionIdPromise: Promise<string | null> | null = null;
  private queue: QueuedEntry[] = [];
  private flushPromise: Promise<void> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private consecutiveFailures = 0;
  private rejected = 0;
  private lastError: string | null = null;
  private degraded = false;
  private clientIdSeq = 0;
  private readonly clientPrefix = `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  private readonly surface = detectSurface();

  /**
   * The session id the core assigned, resolved once and reused.
   *
   * Identity is the core's to decide, not each renderer's — a per-surface id is
   * how one Luca quietly becomes several. Failure is not cached: the core answers
   * 503 while its route groups warm up, so a boot-time miss has to be retryable.
   */
  async getCurrentSessionId(): Promise<string | null> {
    if (this.sessionId) return this.sessionId;
    if (!this.sessionIdPromise) {
      this.sessionIdPromise = this.resolveSessionId().finally(() => {
        this.sessionIdPromise = null;
      });
    }
    return this.sessionIdPromise;
  }

  /**
   * Record one entry. Enqueues and returns; never awaits, never throws.
   */
  append(entry: TranscriptEntry): void {
    try {
      if (!entry?.role) return;
      this.queue.push({
        ...entry,
        clientId: `${this.clientPrefix}-${++this.clientIdSeq}`,
        surface: this.surface,
        createdAt: Date.now(),
      });
      this.publish();
      void this.flush();
    } catch (error) {
      // A transcript must not be able to break the turn it is recording.
      console.error("[TRANSCRIPT] Failed to enqueue an entry:", error);
    }
  }

  /** Record a message the turn loop already built. */
  appendMessage(message: ChatMessage): void {
    this.append(toTranscriptEntry(message));
  }

  /**
   * Record a compaction. The summary is a new entry, not a rewrite: the turns it
   * covers stay on disk even though the model stops being shown them.
   */
  appendSummary(summary: string): void {
    this.append({ role: "summary", content: summary });
  }

  /**
   * Drain the queue. Safe to call at any time; concurrent callers share the one
   * in-flight drain, which is what keeps entries in order.
   */
  flush(): Promise<void> {
    if (!this.flushPromise) {
      this.flushPromise = this.drain().finally(() => {
        this.flushPromise = null;
      });
    }
    return this.flushPromise;
  }

  /** Read the stored transcript back as a provider-shaped history. */
  async loadHistory(
    options: { maxTokens?: number; tail?: number } = {},
  ): Promise<ChatMessage[]> {
    const maxTokens = options.maxTokens ?? HYDRATION_TOKEN_BUDGET;
    const tail = options.tail ?? HYDRATION_TAIL_ENTRIES;

    const sessionId = await this.getCurrentSessionId();
    if (!sessionId) return [];

    try {
      const response = await fetch(
        apiUrl(
          `/api/session/${encodeURIComponent(sessionId)}/entries?tail=${tail}`,
        ),
        { headers: getAuthHeaders() },
      );
      if (!response.ok) {
        this.noteReadError(`entries -> HTTP ${response.status}`);
        return [];
      }
      const body = (await response.json()) as {
        entries?: TranscriptEntryRow[];
        degraded?: boolean;
      };
      this.noteDegraded(body?.degraded);
      this.publish();
      return buildHistory(body?.entries ?? [], maxTokens);
    } catch (error) {
      this.noteReadError(describeError(error));
      return [];
    }
  }

  /**
   * Begin a new session, archiving the current one. Returns null if the core
   * could not be reached, in which case the old session stays current.
   */
  async startNewSession(title?: string): Promise<TranscriptSession | null> {
    try {
      await this.flush();
      await waitForAuth();
      const response = await fetch(apiUrl("/api/session/new"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: title ?? null }),
      });
      if (!response.ok) {
        this.noteReadError(`session/new -> HTTP ${response.status}`);
        return null;
      }
      const body = (await response.json()) as {
        session?: TranscriptSession;
        degraded?: boolean;
      };
      if (!body?.session?.id) return null;
      this.sessionId = body.session.id;
      this.noteDegraded(body.degraded);
      this.publish();
      return body.session;
    } catch (error) {
      this.noteReadError(describeError(error));
      return null;
    }
  }

  status(): TranscriptStatus {
    return {
      sessionId: this.sessionId,
      pending: this.queue.length,
      consecutiveFailures: this.consecutiveFailures,
      rejected: this.rejected,
      unpersisted:
        this.queue.length > 0 && this.consecutiveFailures >= LOUD_AFTER_FAILURES,
      degraded: this.degraded,
      lastError: this.lastError,
    };
  }

  /** Stop the retry timer. For tests and teardown; the queue is left intact. */
  stop(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Track what the server says about its own storage. A response that omits the
   * field says nothing about it, so the flag stays where it was — health is not
   * something to infer from a missing key.
   */
  private noteDegraded(value: unknown): void {
    if (typeof value === "boolean") this.degraded = value;
  }

  private async resolveSessionId(): Promise<string | null> {
    try {
      await waitForAuth();
      const response = await fetch(apiUrl("/api/session/current"), {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        this.noteWriteFailure(`session/current -> HTTP ${response.status}`);
        return null;
      }
      const body = (await response.json()) as {
        session?: TranscriptSession;
        degraded?: boolean;
      };
      if (!body?.session?.id) {
        this.noteWriteFailure("session/current returned no session");
        return null;
      }
      this.noteDegraded(body.degraded);
      this.sessionId = body.session.id;
      this.publish();
      return this.sessionId;
    } catch (error) {
      this.noteWriteFailure(describeError(error));
      return null;
    }
  }

  private async drain(): Promise<void> {
    while (this.queue.length > 0) {
      const sessionId = await this.getCurrentSessionId();
      if (!sessionId) {
        this.scheduleRetry();
        return;
      }

      const batch = this.queue.slice(0, FLUSH_BATCH_MAX);
      const outcome = await this.postBatch(sessionId, batch);

      if (outcome === "retry") {
        // The batch stays at the head of the queue: later entries must not
        // overtake it, or the stored order would not be the real order.
        this.scheduleRetry();
        return;
      }

      // Only this method removes from the front, and only one drain runs at a
      // time, so the head is still the batch we just sent.
      this.queue.splice(0, batch.length);
      if (outcome === "ok") this.noteSuccess();
      this.publish();
    }
  }

  private async postBatch(
    sessionId: string,
    batch: readonly QueuedEntry[],
  ): Promise<FlushOutcome> {
    try {
      const response = await fetch(
        apiUrl(`/api/session/${encodeURIComponent(sessionId)}/entries`),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ entries: batch }),
        },
      );

      if (response.ok) {
        const body = (await response.json().catch(() => null)) as {
          degraded?: boolean;
        } | null;
        this.noteDegraded(body?.degraded);
        return "ok";
      }

      // The session we hold is gone — a reset database, say. Forget it so the
      // next attempt resolves a live one instead of retrying into a 404 forever.
      if (response.status === 404) {
        this.sessionId = null;
        this.noteWriteFailure(`entries -> 404 (session ${sessionId} unknown)`);
        return "retry";
      }

      // 400 means the store refused the shape of these entries, which no amount
      // of retrying will fix. Retrying would block every later entry behind a
      // batch that can never land, so it is dropped — loudly, and counted.
      if (response.status === 400) {
        const detail = await readErrorDetail(response);
        this.rejected += batch.length;
        this.noteWriteFailure(`entries -> 400: ${detail}`);
        console.error(
          `[TRANSCRIPT] The store rejected ${batch.length} entr${
            batch.length === 1 ? "y" : "ies"
          } (roles: ${batch.map((e) => e.role).join(", ")}). ` +
            `They are NOT saved. ${detail}`,
        );
        return "rejected";
      }

      const detail = await readErrorDetail(response);
      this.noteWriteFailure(
        `entries -> HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
      );
      return "retry";
    } catch (error) {
      this.noteWriteFailure(describeError(error));
      return "retry";
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimer) return;
    const delay =
      RETRY_DELAYS_MS[
        Math.min(this.consecutiveFailures, RETRY_DELAYS_MS.length - 1)
      ] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.flush();
    }, delay);
  }

  private noteSuccess(): void {
    if (this.consecutiveFailures >= LOUD_AFTER_FAILURES) {
      console.info(
        `[TRANSCRIPT] Recovered — the session transcript is persisting again (${this.queue.length} still queued).`,
      );
    }
    this.consecutiveFailures = 0;
    this.lastError = null;
  }

  /**
   * A write did not land. Loud once the failures persist AND entries are
   * actually backing up: one 503 while the core warms up is not worth shouting
   * about, but a conversation the user believes is being kept certainly is.
   */
  private noteWriteFailure(message: string): void {
    this.consecutiveFailures += 1;
    this.lastError = message;
    this.publish();

    if (this.consecutiveFailures < LOUD_AFTER_FAILURES) return;
    if (this.queue.length === 0) return;
    const sinceLoud = this.consecutiveFailures - LOUD_AFTER_FAILURES;
    if (sinceLoud % LOUD_EVERY !== 0) return;

    console.error(
      `[TRANSCRIPT] ${this.queue.length} entr${
        this.queue.length === 1 ? "y is" : "ies are"
      } NOT persisted after ${this.consecutiveFailures} failed attempts. ` +
        `The conversation is still running, but this session will not survive a restart. Last error: ${message}`,
    );
  }

  /** A read failed. Recorded, but it says nothing about whether writes land. */
  private noteReadError(message: string): void {
    this.lastError = message;
    this.publish();
    console.warn(`[TRANSCRIPT] Could not read the stored transcript: ${message}`);
  }

  private publish(): void {
    statusHost().__LUCA_TRANSCRIPT_STATUS = this.status();
  }
}

export { SessionTranscript };
export const sessionTranscript = new SessionTranscript();
