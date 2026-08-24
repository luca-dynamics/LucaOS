import type { AgentSessionContinuityRecord } from "../../types/agentSessionContinuity";

export type SessionsRailTone = "ok" | "warn" | "idle";

export interface SessionsRailRow {
  sessionId: string;
  title: string;
  /** Short lowercase status word, e.g. "auto", "needs you", "paused". */
  sub: string;
  tone: SessionsRailTone;
  /** ISO timestamp of the last update — the rail buckets Today / Earlier. */
  updatedAt: string;
}

/** Bucket a row by recency for the rail's "Today / Earlier" whispers. */
export function bucketSessionRow(
  updatedAt: string,
  now: number = Date.now(),
): "today" | "earlier" {
  const then = new Date(updatedAt).getTime();
  if (!Number.isFinite(then)) return "earlier";
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return then >= startOfToday.getTime() ? "today" : "earlier";
}

const HIDDEN_LIFECYCLE_STATES = new Set([
  "completed",
  "archived",
  "quarantined",
]);

export const SESSIONS_RAIL_MAX_ROWS = 6;

/**
 * Maps continuity records to the left rail's SESSIONS rows (design target
 * dashboard-being.html): a session is alive — needs-you beats running beats
 * resting. Display-only; no execution semantics.
 */
export function buildSessionsRailRows(
  records: AgentSessionContinuityRecord[],
): SessionsRailRow[] {
  return records
    .filter(
      (record) =>
        record.userVisible && !HIDDEN_LIFECYCLE_STATES.has(record.lifecycleState),
    )
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, SESSIONS_RAIL_MAX_ROWS)
    .map((record) => {
      if (record.pendingApprovalIds.length > 0) {
        return {
          sessionId: record.sessionId,
          title: record.title,
          sub: "needs you",
          tone: "warn" as const,
          updatedAt: record.updatedAt,
        };
      }
      if (record.lifecycleState === "active") {
        return {
          sessionId: record.sessionId,
          title: record.title,
          sub: record.pendingActions.length > 0 ? "auto" : "active",
          tone: "ok" as const,
          updatedAt: record.updatedAt,
        };
      }
      return {
        sessionId: record.sessionId,
        title: record.title,
        sub: record.lifecycleState === "resumable" ? "resumable" : "paused",
        tone: "idle" as const,
        updatedAt: record.updatedAt,
      };
    });
}

// ── Conversation threads ────────────────────────────────────────────────────

/**
 * The shape `buildThreadRailRows` needs, stated structurally rather than
 * imported. `ConversationThread` satisfies it, but this module stays a model —
 * it must not pull a localStorage-backed service into a pure function's
 * dependency graph, and a test must be able to pass three plain objects.
 */
export interface ThreadRailThread {
  id: string;
  title: string;
  /** ISO timestamp. */
  updatedAt: string;
  messages: readonly unknown[];
}

export interface ThreadRailRow {
  id: string;
  title: string;
  /** Short, dim, right-aligned: a time today, a weekday this week, else a date. */
  when: string;
  bucket: "today" | "earlier";
  /** The thread you are in. Carries the filled dot; everything else is hollow. */
  active: boolean;
}

const MS_PER_DAY = 86_400_000;

/** A time today, a weekday within the week, otherwise a short date. */
function formatThreadWhen(updatedAt: string, now: number): string {
  const then = new Date(updatedAt).getTime();
  if (!Number.isFinite(then)) return "";
  if (bucketSessionRow(updatedAt, now) === "today") {
    return new Date(then).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (now - then < 7 * MS_PER_DAY) {
    return new Date(then).toLocaleDateString([], { weekday: "short" });
  }
  return new Date(then).toLocaleDateString([], { month: "short", day: "numeric" });
}

/**
 * Conversation threads as left-rail rows: newest first, bucketed Today /
 * Earlier, capped at the same `SESSIONS_RAIL_MAX_ROWS` the agent rail uses so
 * the two lists can never disagree about how long a calm rail is.
 *
 * Empty threads are dropped EXCEPT the active one. Otherwise pressing "New chat"
 * three times and typing nothing would leave three identical "New chat" rows —
 * and hiding the one you are currently in would be worse still, because then the
 * rail would not show you where you are.
 */
export function buildThreadRailRows(
  threads: readonly ThreadRailThread[],
  activeId?: string,
  now: number = Date.now(),
): ThreadRailRow[] {
  return threads
    .filter(
      (thread) => thread.messages.length > 0 || thread.id === activeId,
    )
    .slice()
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, SESSIONS_RAIL_MAX_ROWS)
    .map((thread) => ({
      id: thread.id,
      title: thread.title,
      when: formatThreadWhen(thread.updatedAt, now),
      bucket: bucketSessionRow(thread.updatedAt, now),
      active: thread.id === activeId,
    }));
}
