import type { RuntimeInboxEvent } from "../../types/runtimeInbox";

/**
 * "While you were away" — the being accounts for what happened without the
 * user watching (design target dashboard-being.html). Pure selection logic:
 * unread, unarchived, non-user runtime events that arrived since the user
 * last dismissed the strip. Display-only; dismissing marks events read and
 * nothing else.
 */

export const AWAY_STRIP_LAST_SEEN_KEY = "LUCA_AWAY_STRIP_LAST_SEEN_V1";
export const AWAY_STRIP_MAX_ROWS = 3;

export interface AwayStripRow {
  inboxEventId: string;
  title: string;
  source: string;
}

export interface AwayStripModel {
  rows: AwayStripRow[];
  /** Events beyond the visible rows ("and N more"). */
  overflowCount: number;
  /** Every away-event id, for the honest dismiss (markRead). */
  allEventIds: string[];
}

export function buildAwayStrip(
  events: RuntimeInboxEvent[],
  lastSeenAt: string | null,
): AwayStripModel {
  // First visit: nothing to account for yet — stay silent.
  if (!lastSeenAt) return { rows: [], overflowCount: 0, allEventIds: [] };

  const away = events
    .filter(
      (event) =>
        !event.readAt &&
        !event.archivedAt &&
        event.source !== "user" &&
        event.createdAt > lastSeenAt,
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return {
    rows: away.slice(0, AWAY_STRIP_MAX_ROWS).map((event) => ({
      inboxEventId: event.inboxEventId,
      title: event.title,
      source: event.source.replace(/_/g, " "),
    })),
    overflowCount: Math.max(0, away.length - AWAY_STRIP_MAX_ROWS),
    allEventIds: away.map((event) => event.inboxEventId),
  };
}
