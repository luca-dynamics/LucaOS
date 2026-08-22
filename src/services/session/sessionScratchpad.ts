import { apiUrl, getAuthHeaders } from "../../config/api";
import { detectSurface, sessionTranscript } from "./sessionTranscript";

/**
 * `luca.state`: the session's durable working data.
 *
 * A script run through `execute_script` can hold a 10 000-row intermediate result
 * in memory for exactly as long as the call lasts. The transcript then carries the
 * rows themselves — until Tier 1a's compaction summarises that stretch away and
 * the working data is gone with it. This client is the other half of the
 * `session_scratchpad` table in `cortex/server/services/sessionEntryStore.js`: the
 * rows live in the core under the session id, the transcript carries only *"stored
 * 10 000 rows in luca.state.rows"*, and a later call reads them back.
 *
 * Two properties define it, and the first is the opposite of the turn lease's:
 *
 * 1. **It fails loud, never open.** `sessionLease.ts` admits a turn when the core
 *    cannot be reached, because refusing to think without a disk is the wrong
 *    trade. This is *data*, so it obeys
 *    `foundation/02-specification/10-data-and-storage.md` instead: a write that did
 *    not land is reported as `persisted: false` with a reason, and the caller says
 *    so in its output. There is **no in-memory fallback** — a fallback would make
 *    "stored in luca.state" true for this call and false for the next one, which is
 *    exactly the silent lie that spec forbids.
 * 2. **A deletion needs a baseline.** A flush is authoritative: keys absent from it
 *    are removed, because that is the only way JSON can express
 *    `delete luca.state.rows`. That is safe only when the object being flushed came
 *    from a successful load. If the load failed and the save then succeeds, the
 *    save **merges** rather than replaces — otherwise one unreachable moment would
 *    have an empty object delete a session's entire working set. The caveat travels
 *    back in `reason` rather than being silently applied.
 *
 * The session id is read synchronously from whatever `sessionTranscript` has
 * already resolved, and deliberately never resolved here: `getCurrentSessionId()`
 * awaits `waitForAuth()`, a flat two seconds in browser development, and this runs
 * on the tool path. Same note as `sessionLease.ts`.
 */

/** Server-published budget, so a caller can say *how* full before it fills. */
export interface ScratchpadLimits {
  maxKeyBytes: number;
  maxSessionBytes: number;
  maxKeys: number;
}

export interface ScratchpadLoad {
  /** The durable state, or `{}` when it could not be read. Never null. */
  state: Record<string, unknown>;
  /**
   * True when the store answered and `state` is therefore the durable state.
   * False means "this is an empty object because nothing could be read", which is
   * a different fact from "the scratchpad is empty".
   */
  persisted: boolean;
  /** Why the load is not authoritative, or a caveat about what it contains. */
  reason: string | null;
  bytesUsed: number;
  keyCount: number;
  limits: ScratchpadLimits | null;
}

export interface ScratchpadSave {
  /** True only if the core confirmed the write. Never optimistic. */
  persisted: boolean;
  /**
   * Set whenever the caller must say something: a refusal, or a write that
   * landed with a caveat (a merge without a baseline, a key JSON dropped).
   * `persisted: true` with a non-null reason is a real state, not a contradiction.
   */
  reason: string | null;
  bytesUsed: number;
  keyCount: number;
}

export interface SessionScratchpadStatus {
  sessionId: string | null;
  surface: string;
  /** Whether the last load answered from the store. */
  loaded: boolean;
  /**
   * Last known usage. Held across a failed load rather than zeroed — `loaded:
   * false` is what says they are stale, and zeroing would read as "empty".
   */
  bytesUsed: number;
  keyCount: number;
  /**
   * Saves that did not land. Counted rather than ignored: losing working data is
   * acceptable when the core is down, but it must never be invisible.
   */
  failedSaves: number;
  lastSavedAt: number | null;
  lastError: string | null;
  limits: ScratchpadLimits | null;
}

/**
 * Where the status is published, mirroring `__LUCA_SESSION_LEASE`,
 * `__LUCA_TRANSCRIPT_STATUS` and `__LUCA_DB_STATUS`.
 *
 * An explicit intersection rather than `declare global { var … }`: under this
 * repo's `tsconfig` that augmentation does not attach to `typeof globalThis`,
 * `tsc` reports TS7017 at every access, and the property is silently an implicit
 * `any` — the untyped seam Invariant 6 rules out.
 */
type ScratchpadStatusHost = typeof globalThis & {
  __LUCA_SCRATCHPAD?: SessionScratchpadStatus;
};

const statusHost = (): ScratchpadStatusHost => globalThis as ScratchpadStatusHost;

/** The last published scratchpad status, readable without holding a reference. */
export function publishedScratchpadStatus(): SessionScratchpadStatus | undefined {
  return statusHost().__LUCA_SCRATCHPAD;
}

/**
 * Ceiling on a scratchpad round trip.
 *
 * Deliberately longer than the lease's 1.5 s. A save carries up to a megabyte
 * into SQLite on a disk this repo documents as slow, and a timeout that fires on
 * a write which then lands would report `persisted: false` for durable data —
 * safe, but a lie in the other direction. The 30 s script race in
 * `programmaticToolExecutor.ts` still bounds the whole call.
 */
export const SCRATCHPAD_TIMEOUT_MS = 5_000;

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** The store's `limits`, without trusting the shape of what came back. */
function toLimits(value: unknown): ScratchpadLimits | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const maxKeyBytes = Number(raw.maxKeyBytes);
  const maxSessionBytes = Number(raw.maxSessionBytes);
  const maxKeys = Number(raw.maxKeys);
  if (!maxKeyBytes || !maxSessionBytes || !maxKeys) return null;
  return { maxKeyBytes, maxSessionBytes, maxKeys };
}

/** A plain object of values, or `{}` for anything else the wire produced. */
function toState(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

/**
 * Top-level keys JSON will drop on the way out.
 *
 * `luca.state.parse = (s) => …` is the mistake a script actually makes, and
 * `JSON.stringify` removes it without a word — so the next call finds the key
 * missing and no explanation anywhere. Only the top level is checked: a nested
 * function is rarer, and walking a megabyte of rows to find one is not worth the
 * cost on every flush.
 */
function unstorableKeys(state: Record<string, unknown>): string[] {
  return Object.entries(state)
    .filter(([, value]) => typeof value === "function" || typeof value === "symbol")
    .map(([key]) => key);
}

/** Prefer the server's own message; fall back to the status line. */
async function describeHttpFailure(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (typeof body?.error === "string" && body.error) return body.error;
  return `scratchpad -> HTTP ${response.status}`;
}

class SessionScratchpad {
  private readonly surface = detectSurface();

  /**
   * The session whose state was last loaded successfully. A flush may only
   * delete by absence when this matches the session it is flushing into — see
   * property 2 in the file header.
   */
  private baselineSessionId: string | null = null;
  private bytesUsed = 0;
  private keyCount = 0;
  private failedSaves = 0;
  private lastSavedAt: number | null = null;
  private lastError: string | null = null;
  private limits: ScratchpadLimits | null = null;

  /**
   * Read the session's durable state. Never throws, never rejects.
   *
   * An unreachable core loads as empty with `persisted: false` — empty *and
   * unknown*, which the caller reports rather than presenting as an empty
   * scratchpad.
   */
  async load(): Promise<ScratchpadLoad> {
    const empty = (reason: string): ScratchpadLoad => {
      this.baselineSessionId = null;
      this.lastError = reason;
      this.publish();
      return { state: {}, persisted: false, reason, bytesUsed: 0, keyCount: 0, limits: this.limits };
    };

    try {
      // Read, never resolve. See the file header.
      const sessionId = sessionTranscript.status().sessionId;
      if (!sessionId) return empty("no session id resolved yet");

      const response = await fetch(
        apiUrl(`/api/session/${encodeURIComponent(sessionId)}/scratchpad`),
        {
          method: "GET",
          headers: getAuthHeaders(),
          signal: AbortSignal.timeout(SCRATCHPAD_TIMEOUT_MS),
        },
      );

      if (!response.ok) return empty(await describeHttpFailure(response));

      const body = (await response.json().catch(() => null)) as {
        state?: unknown;
        corruptKeys?: unknown;
        bytesUsed?: unknown;
        keyCount?: unknown;
        limits?: unknown;
        degraded?: unknown;
      } | null;
      if (!body) return empty("scratchpad response was not JSON");

      // A degraded store answers 503 on write and cannot be a baseline: treating
      // its read as authoritative would let a later merge look like a replace.
      if (body.degraded === true) return empty("session store is not writable");

      const state = toState(body.state);
      this.baselineSessionId = sessionId;
      this.bytesUsed = Number(body.bytesUsed) || 0;
      this.keyCount = Number(body.keyCount) || Object.keys(state).length;
      this.limits = toLimits(body.limits) ?? this.limits;
      this.lastError = null;
      this.publish();

      // Unreadable rows are omitted from `state`, so the next authoritative flush
      // deletes them by absence. Say so now, while it is still recoverable, rather
      // than letting the data disappear between two successful-looking calls.
      const corrupt = Array.isArray(body.corruptKeys) ? body.corruptKeys.filter((k) => typeof k === "string") : [];
      const reason = corrupt.length
        ? `${corrupt.length} stored key(s) could not be read (${corrupt.join(", ")}) ` +
          "and will be dropped by the next save"
        : null;

      return {
        state,
        persisted: true,
        reason,
        bytesUsed: this.bytesUsed,
        keyCount: this.keyCount,
        limits: this.limits,
      };
    } catch (error) {
      // Includes the abort from SCRATCHPAD_TIMEOUT_MS and a core that is simply
      // not running.
      return empty(describeError(error));
    }
  }

  /**
   * Flush the whole state object. Never throws, never rejects, never claims a
   * write that did not land.
   *
   * The body is authoritative when it came from a successful `load()`: keys the
   * script deleted are absent, and the store removes them. Without that baseline
   * the write merges, and `reason` says which deletions were not applied.
   */
  async save(next: Record<string, unknown>): Promise<ScratchpadSave> {
    const failed = (reason: string): ScratchpadSave => {
      this.failedSaves += 1;
      this.lastError = reason;
      this.publish();
      return { persisted: false, reason, bytesUsed: this.bytesUsed, keyCount: this.keyCount };
    };

    try {
      if (!next || typeof next !== "object" || Array.isArray(next)) {
        return failed("luca.state was replaced by something that is not an object");
      }

      const sessionId = sessionTranscript.status().sessionId;
      if (!sessionId) return failed("no session id resolved yet");

      const replace = this.baselineSessionId === sessionId;
      const dropped = unstorableKeys(next);

      let payload: string;
      try {
        payload = JSON.stringify({ state: next, surface: this.surface, replace });
      } catch (error) {
        // A circular reference, or a value whose `toJSON` throws. Nothing is sent:
        // a partial object would be worse than a refusal, because half a state is
        // indistinguishable from a whole one on the next read.
        return failed(`luca.state cannot be stored as JSON (${describeError(error)})`);
      }

      const response = await fetch(
        apiUrl(`/api/session/${encodeURIComponent(sessionId)}/scratchpad`),
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: payload,
          signal: AbortSignal.timeout(SCRATCHPAD_TIMEOUT_MS),
        },
      );

      // 413 is the store refusing an over-budget batch, having written nothing.
      // It is a failure like any other here; the message names the limit that was
      // hit so the script's author can store less.
      if (!response.ok) return failed(await describeHttpFailure(response));

      const body = (await response.json().catch(() => null)) as {
        bytesUsed?: unknown;
        keyCount?: unknown;
      } | null;

      this.bytesUsed = Number(body?.bytesUsed) || 0;
      this.keyCount = Number(body?.keyCount) || 0;
      this.lastSavedAt = Date.now();
      this.lastError = null;
      // The baseline is deliberately *not* refreshed here. A successful merge
      // leaves the store holding our keys plus whatever we could not read, so this
      // object still is not authoritative — and a later flush that deleted those
      // unread keys by absence would destroy them. Only a successful `load()`
      // establishes the right to delete.
      this.publish();

      const caveats: string[] = [];
      if (!replace) {
        caveats.push(
          "the previous state could not be read, so this save added and overwrote keys " +
            "but removed none",
        );
      }
      if (dropped.length) {
        caveats.push(`dropped ${dropped.join(", ")} — functions cannot be stored`);
      }

      return {
        persisted: true,
        reason: caveats.length ? caveats.join("; ") : null,
        bytesUsed: this.bytesUsed,
        keyCount: this.keyCount,
      };
    } catch (error) {
      return failed(describeError(error));
    }
  }

  status(): SessionScratchpadStatus {
    return {
      sessionId: this.baselineSessionId,
      surface: this.surface,
      loaded: this.baselineSessionId !== null,
      bytesUsed: this.bytesUsed,
      keyCount: this.keyCount,
      failedSaves: this.failedSaves,
      lastSavedAt: this.lastSavedAt,
      lastError: this.lastError,
      limits: this.limits,
    };
  }

  private publish(): void {
    statusHost().__LUCA_SCRATCHPAD = this.status();
  }
}

export { SessionScratchpad };
export const sessionScratchpad = new SessionScratchpad();
