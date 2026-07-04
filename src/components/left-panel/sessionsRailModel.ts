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
