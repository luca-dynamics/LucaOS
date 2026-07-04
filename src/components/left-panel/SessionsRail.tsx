import React, { useEffect, useMemo, useState } from "react";
import { agentSessionContinuityService } from "../../services/runtime/AgentSessionContinuityService";
import {
  buildSessionsRailRows,
  bucketSessionRow,
  type SessionsRailRow,
  type SessionsRailTone,
} from "./sessionsRailModel";

/**
 * SESSIONS (panel-interiors-target): the rail's living session list — quiet
 * rows under lowercase "Today / Earlier" whispers, dim status on the right.
 * A tone dot only speaks when the session does: amber needs-you, green
 * working, dim at rest. Display-only; nothing executes from here.
 */

const TONE_COLOR: Record<SessionsRailTone, string> = {
  ok: "var(--luca-success, #4fbf7a)",
  warn: "var(--luca-warning, #e0b15a)",
  idle: "var(--luca-border-strong, rgba(255,255,255,0.22))",
};

const REFRESH_MS = 15_000;

const Group: React.FC<{ label: string; rows: SessionsRailRow[] }> = ({
  label,
  rows,
}) => {
  if (rows.length === 0) return null;
  return (
    <>
      <p
        className="px-2 pb-0.5 pt-1 text-[11px]"
        style={{ color: "var(--luca-text-tertiary, var(--app-text-muted))" }}
      >
        {label}
      </p>
      {rows.map((row) => (
        <div
          key={row.sessionId}
          className="flex h-[30px] items-center gap-2.5 rounded-lg px-2 transition-colors hover:bg-[rgba(127,127,127,0.09)]"
        >
          <span
            className={`h-1.5 w-1.5 flex-none rounded-full ${row.tone !== "idle" ? "animate-pulse" : ""}`}
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
            style={{ color: "var(--luca-text-tertiary, var(--app-text-muted))" }}
          >
            {row.sub}
          </span>
        </div>
      ))}
    </>
  );
};

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

  const { today, earlier } = useMemo(() => {
    const now = Date.now();
    return {
      today: rows.filter((r) => bucketSessionRow(r.updatedAt, now) === "today"),
      earlier: rows.filter(
        (r) => bucketSessionRow(r.updatedAt, now) === "earlier",
      ),
    };
  }, [rows]);

  if (rows.length === 0) return null;

  return (
    <div
      className="flex-none border-b px-1.5 py-2"
      style={{ borderColor: "var(--luca-border-subtle, var(--app-border-main))" }}
    >
      <Group label="Today" rows={today} />
      <Group label="Earlier" rows={earlier} />
    </div>
  );
};

export default SessionsRail;
