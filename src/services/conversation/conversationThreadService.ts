import type { Message } from "../../types";
import { Sender } from "../../types";

/**
 * conversationThreadService — the archive Luca never had.
 *
 * Before this, the whole app held ONE conversation: a single flat array under
 * `LUCA_CHAT_HISTORY_V1`, capped at 50 messages by a rolling window that
 * silently deleted message 1 when message 51 arrived. "New session" was a
 * `window.confirm("WARNING: PURGE LUCA LOGS?")` followed by `removeItem` — the
 * only way to start a fresh thought was to destroy the previous one. That is
 * neither persistent (invariant 2) nor revocable (Safety and Permissions), and
 * it is why the left rail had nothing to list.
 *
 * A thread is the container: many of them, each with its own rolling window, and
 * starting one costs nothing. The legacy array becomes thread #1 on first read,
 * and the legacy key is LEFT IN PLACE as the rollback path — a migration that
 * deletes its own source is a migration you cannot undo.
 *
 * Storage is localStorage rather than the settings service or `node:sqlite`, for
 * the same reason `useWorkspacePanels` is: the shell must render the rail at
 * first paint without waiting on a round-trip. When a write fails it says so at
 * `console.error` and keeps the thread in memory for the session — loudly
 * degraded, never silently.
 */

export interface ConversationThread {
  id: string;
  /** Derived from the first user message until the user renames it. */
  title: string;
  /** Set by a rename, so a later message never overwrites the user's own name. */
  titleLocked?: boolean;
  /** ISO timestamps — the rail buckets Today / Earlier off `updatedAt`. */
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const THREADS_KEY = "LUCA_CONVERSATION_THREADS_V1";
const ACTIVE_KEY = "LUCA_ACTIVE_THREAD_V1";

/** The pre-threads store. Read for migration; never written, never deleted. */
export const LEGACY_CHAT_KEY = "LUCA_CHAT_HISTORY_V1";

/** Generous compared with the 50 MESSAGES the single conversation allowed. */
const MAX_THREADS = 100;

/** An untitled thread reads as this until a user message gives it a name. */
export const UNTITLED_THREAD_TITLE = "New chat";

const TITLE_MAX_CHARS = 48;

const nowIso = (): string => new Date().toISOString();

const storage = (): StorageLike | undefined => {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
};

/**
 * A thread's name, from the first thing the user actually said. Falls back to
 * the untitled label rather than to Luca's own opening line — naming a thread
 * after the assistant's greeting would make every thread look alike.
 */
export function deriveThreadTitle(messages: Message[]): string {
  const firstUser = messages.find(
    (message) =>
      message.sender === Sender.USER &&
      !message.isHidden &&
      typeof message.text === "string" &&
      message.text.trim().length > 0,
  );
  if (!firstUser) return UNTITLED_THREAD_TITLE;

  const flat = firstUser.text.replace(/\s+/g, " ").trim();
  if (flat.length <= TITLE_MAX_CHARS) return flat;

  // Break on a word boundary, so a rail row never reads "…deployment pipeline en…".
  // A single very long word has no boundary to find, so it is cut where it falls.
  const clipped = flat.slice(0, TITLE_MAX_CHARS);
  const lastSpace = clipped.lastIndexOf(" ");
  const stem = lastSpace > TITLE_MAX_CHARS * 0.6 ? clipped.slice(0, lastSpace) : clipped;
  return `${stem.trimEnd()}…`;
}

const isThread = (value: unknown): value is ConversationThread => {
  const candidate = value as Partial<ConversationThread> | null;
  return Boolean(
    candidate &&
      typeof candidate.id === "string" &&
      typeof candidate.title === "string" &&
      Array.isArray(candidate.messages),
  );
};

export class ConversationThreadService {
  private threads: ConversationThread[] = [];
  private activeId: string | null = null;
  private loaded = false;
  /** True once a write has failed; surfaced so the UI can stop promising durability. */
  private degraded = false;

  constructor(private readonly store: StorageLike | undefined = storage()) {}

  // ── Reading ───────────────────────────────────────────────────────────────

  /** Newest first, which is the order the rail renders. */
  listThreads(): ConversationThread[] {
    this.load();
    return [...this.threads];
  }

  getThread(id: string): ConversationThread | undefined {
    this.load();
    return this.threads.find((thread) => thread.id === id);
  }

  getActiveThreadId(): string {
    return this.ensureActiveThread().id;
  }

  /**
   * The thread the composer writes into. Creates one on a genuinely fresh
   * install, and adopts the legacy conversation on an upgrade — so no caller
   * ever has to handle "there is no thread yet".
   */
  ensureActiveThread(): ConversationThread {
    this.load();
    const existing = this.activeId
      ? this.threads.find((thread) => thread.id === this.activeId)
      : undefined;
    if (existing) return existing;
    const fallback = this.threads[0];
    if (fallback) {
      this.activeId = fallback.id;
      this.persistActive();
      return fallback;
    }
    return this.createThread();
  }

  /** True when a write has failed and this session's threads are memory-only. */
  isDegraded(): boolean {
    return this.degraded;
  }

  // ── Writing ───────────────────────────────────────────────────────────────

  createThread(title: string = UNTITLED_THREAD_TITLE): ConversationThread {
    this.load();
    const timestamp = nowIso();
    const thread: ConversationThread = {
      id: `thread:${timestamp}:${Math.random().toString(36).slice(2, 8)}`,
      title,
      createdAt: timestamp,
      updatedAt: timestamp,
      messages: [],
    };
    this.threads = [thread, ...this.threads];
    this.prune();
    this.activeId = thread.id;
    this.persist();
    this.persistActive();
    return thread;
  }

  setActiveThreadId(id: string): ConversationThread | undefined {
    this.load();
    const thread = this.threads.find((item) => item.id === id);
    if (!thread) return undefined;
    this.activeId = id;
    this.persistActive();
    return thread;
  }

  /**
   * Replace a thread's messages. The caller owns pruning (useChatController
   * already strips large attachments and holds the rolling window), so this
   * writes exactly what it is given, and only names the thread while the user
   * has not named it themselves.
   */
  saveMessages(id: string, messages: Message[]): ConversationThread | undefined {
    this.load();
    const existing = this.threads.find((thread) => thread.id === id);
    if (!existing) return undefined;
    const next: ConversationThread = {
      ...existing,
      messages,
      title: existing.titleLocked ? existing.title : deriveThreadTitle(messages),
      updatedAt: nowIso(),
    };
    this.threads = this.threads.map((thread) => (thread.id === id ? next : thread));
    this.persist();
    return next;
  }

  renameThread(id: string, title: string): ConversationThread | undefined {
    this.load();
    const trimmed = title.replace(/\s+/g, " ").trim();
    if (!trimmed) return this.getThread(id);
    const existing = this.threads.find((thread) => thread.id === id);
    if (!existing) return undefined;
    const next: ConversationThread = {
      ...existing,
      title: trimmed,
      titleLocked: true,
      updatedAt: nowIso(),
    };
    this.threads = this.threads.map((thread) => (thread.id === id ? next : thread));
    this.persist();
    return next;
  }

  /**
   * Drop one thread. Returns the id that is active afterwards — the next thread
   * in the list, or a fresh one if that was the last, so the composer is never
   * left pointing at nothing.
   */
  deleteThread(id: string): string {
    this.load();
    this.threads = this.threads.filter((thread) => thread.id !== id);
    this.persist();
    if (this.activeId !== id) return this.getActiveThreadId();
    this.activeId = null;
    return this.ensureActiveThread().id;
  }

  /**
   * Settings → Data → "Clear sessions". Long-term memory is untouched.
   *
   * This is the one place the legacy key is removed too. Leaving it would make
   * the button a lie: `load()` treats a missing thread store as "not migrated
   * yet", so the cleared conversation would reappear on the next launch.
   */
  clearAllThreads(): void {
    this.threads = [];
    this.activeId = null;
    this.loaded = true;
    try {
      this.store?.removeItem(THREADS_KEY);
      this.store?.removeItem(ACTIVE_KEY);
      this.store?.removeItem(LEGACY_CHAT_KEY);
    } catch (error) {
      console.error("[THREADS] Could not clear the thread store:", error);
    }
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  /**
   * Read once per instance. On an upgrade the legacy single conversation is
   * adopted as thread #1 so nothing the user said disappears behind the new UI.
   */
  private load(): void {
    if (this.loaded) return;
    this.loaded = true;

    try {
      const raw = this.store?.getItem(THREADS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) {
        this.threads = parsed.filter(isThread);
        this.activeId = this.store?.getItem(ACTIVE_KEY) ?? null;
        return;
      }
    } catch (error) {
      console.error("[THREADS] Thread store unreadable; starting empty:", error);
    }

    const migrated = this.migrateLegacyConversation();
    if (migrated) {
      this.threads = [migrated];
      this.activeId = migrated.id;
      this.persist();
      this.persistActive();
    }
  }

  private migrateLegacyConversation(): ConversationThread | null {
    let legacy: Message[] = [];
    try {
      const raw = this.store?.getItem(LEGACY_CHAT_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) legacy = parsed as Message[];
    } catch (error) {
      console.error("[THREADS] Legacy chat history unreadable:", error);
      return null;
    }
    if (legacy.length === 0) return null;

    const timestamps = legacy
      .map((message) => Number(message.timestamp))
      .filter((value) => Number.isFinite(value) && value > 0);
    const createdAt = timestamps.length
      ? new Date(Math.min(...timestamps)).toISOString()
      : nowIso();
    const updatedAt = timestamps.length
      ? new Date(Math.max(...timestamps)).toISOString()
      : nowIso();

    console.log(
      `[THREADS] Migrated ${legacy.length} messages from ${LEGACY_CHAT_KEY} into the first thread. The legacy key is kept as a rollback path.`,
    );

    return {
      id: `thread:migrated:${createdAt}`,
      title: deriveThreadTitle(legacy),
      createdAt,
      updatedAt,
      messages: legacy,
    };
  }

  private prune(): void {
    if (this.threads.length <= MAX_THREADS) return;
    const dropped = this.threads.length - MAX_THREADS;
    this.threads = this.threads.slice(0, MAX_THREADS);
    console.warn(
      `[THREADS] Reached the ${MAX_THREADS}-thread ceiling; dropped the ${dropped} oldest.`,
    );
  }

  private persist(): void {
    try {
      this.store?.setItem(THREADS_KEY, JSON.stringify(this.threads));
      this.degraded = false;
    } catch (error) {
      // Not graceful degradation — the user is about to lose this thread on
      // reload, and they should be able to find out why.
      this.degraded = true;
      console.error(
        "[THREADS] Could not save conversations; this session is memory-only:",
        error,
      );
    }
  }

  private persistActive(): void {
    try {
      if (this.activeId) this.store?.setItem(ACTIVE_KEY, this.activeId);
    } catch (error) {
      console.error("[THREADS] Could not save the active thread id:", error);
    }
  }
}

export const conversationThreadService = new ConversationThreadService();
export default conversationThreadService;
