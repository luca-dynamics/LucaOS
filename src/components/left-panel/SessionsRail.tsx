import React, { useEffect, useState } from "react";
import { agentSessionContinuityService } from "../../services/runtime/AgentSessionContinuityService";
import {
  buildSessionsRailRows,
  type SessionsRailRow,
  type SessionsRailTone,
} from "./sessionsRailModel";

/**
 * SESSIONS — the left rail's living session list (design target
 * dashboard-being.html). Each row is a session with a status dot:
 * amber "needs you", green "auto/active", quiet grey at rest.
 * Display-only: rows report the being's state; nothing executes from here.
 */

const TONE_COLOR: Record<SessionsRailTone, string> = {
  ok: "var(--luca-success, #4fbf7a)",
  warn: "var(--luca-warning, #e0b15a)",
  idle: "var(--luca-border-strong, rgba(255,255,255,0.25))",
};

const REFRESH_MS = 15_000;

export const SessionsRail: React.FC = () => {
  const [rows, setRows] = useState<SessionsRailRow[]>(() =>
    buildSessionsRailRows(agentSessionContinuityService.listSessions()),
  );

  useEffect(() => {
    const refresh = () =>
      setRows(
        buildSessionsRailRows(agentSessionContinuityService.listSessions()),
      );
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  if (rows.length === 0) return null;

  return (
    <div
      className="flex-none border-b px-3 py-2.5"
      style={{
        borderColor: "var(--luca-border-subtle, var(--app-border-main))",
      }}
    >
      <p
        className="px-1 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: "var(--luca-text-tertiary, var(--app-text-muted))" }}
      >
        Sessions
      </p>
      {rows.map((row) => (
        <div
          key={row.sessionId}
          className="flex h-[30px] items-center gap-2.5 rounded-lg px-2"
        >
          <span
            className="h-1.5 w-1.5 flex-none rounded-full"
            style={{ background: TONE_COLOR[row.tone] }}
            aria-hidden="true"
          />
          <span
            className="min-w-0 truncate text-[12.5px]"
            style={{ color: "var(--luca-text-primary, var(--app-text-main))" }}
          >
            {row.title}
          </span>
          <span
            className="ml-auto flex-none text-[11px]"
            style={{
              color: "var(--luca-text-tertiary, var(--app-text-muted))",
            }}
          >
            {row.sub}
          </span>
        </div>
      ))}
    </div>
  );
};

export default SessionsRail;
