import React, { useCallback, useEffect, useState } from "react";
import { runtimeInboxService } from "../../services/runtime/RuntimeInboxService";
import {
  AWAY_STRIP_LAST_SEEN_KEY,
  buildAwayStrip,
  type AwayStripModel,
} from "./awayStripModel";

/**
 * The being accounts for itself: a quiet card above the composer listing
 * what happened while the user was away. Dismiss marks the events read —
 * nothing else. Silent on first run and when nothing happened.
 */

function readLastSeen(): string | null {
  try {
    return window.localStorage.getItem(AWAY_STRIP_LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

function writeLastSeen(value: string): void {
  try {
    window.localStorage.setItem(AWAY_STRIP_LAST_SEEN_KEY, value);
  } catch {
    /* storage unavailable — the strip simply reappears next time */
  }
}

function buildModel(): AwayStripModel {
  try {
    return buildAwayStrip(runtimeInboxService.listEvents(), readLastSeen());
  } catch {
    return { rows: [], overflowCount: 0, allEventIds: [] };
  }
}

export const WhileYouWereAwayStrip: React.FC = () => {
  const [model, setModel] = useState<AwayStripModel>(buildModel);

  useEffect(() => {
    // First visit: start the clock quietly so the next return has history.
    if (!readLastSeen()) writeLastSeen(new Date().toISOString());
  }, []);

  const dismiss = useCallback(() => {
    for (const id of model.allEventIds) {
      try {
        runtimeInboxService.markRead(id);
      } catch {
        /* best-effort: unread events reappear next visit */
      }
    }
    writeLastSeen(new Date().toISOString());
    setModel({ rows: [], overflowCount: 0, allEventIds: [] });
  }, [model.allEventIds]);

  if (model.rows.length === 0) return null;

  return (
    <div
      className="mb-2 rounded-2xl border p-3.5"
      style={{
        background: "var(--luca-surface-glass, rgba(255,255,255,0.025))",
        borderColor: "var(--luca-border-subtle, rgba(255,255,255,0.08))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <div className="flex items-center">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--app-text-muted)]">
          While you were away
        </span>
        <button
          type="button"
          onClick={dismiss}
          className="ml-auto rounded-md px-2 py-0.5 text-[11px] font-medium text-[var(--app-text-muted)] transition-colors hover:bg-[var(--luca-surface-hover,rgba(255,255,255,0.06))]"
        >
          Dismiss
        </button>
      </div>
      <div className="mt-1.5">
        {model.rows.map((row) => (
          <div
            key={row.inboxEventId}
            className="flex h-[26px] items-center gap-2 text-xs"
          >
            <span
              className="h-1 w-1 flex-none rounded-full bg-[var(--luca-border-strong,rgba(255,255,255,0.25))]"
              aria-hidden="true"
            />
            <span className="min-w-0 truncate text-[var(--app-text-main)]">
              {row.title}
            </span>
            <span className="ml-auto flex-none text-[11px] text-[var(--app-text-muted)]">
              {row.source}
            </span>
          </div>
        ))}
        {model.overflowCount > 0 && (
          <div className="pt-0.5 text-[11px] text-[var(--app-text-muted)]">
            and {model.overflowCount} more in Activity
          </div>
        )}
      </div>
    </div>
  );
};

export default WhileYouWereAwayStrip;
