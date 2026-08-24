import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { PanelHeader, CollapseToggle, SectionLabel } from "./WorkspacePrimitives";
import {
  workspaceColor,
  workspaceRadius,
  workspaceType,
} from "./workspaceShellTokens";
import {
  RIGHT_PANEL_LABELS,
  formatMemoryValue,
  friendlyRuntimeHeadline,
  isRenderableMemory,
  summarizeToolLog,
  type RightPanelMode,
} from "../right-panel/rightPanelModel";
import {
  getVisibleRightPanelModes,
  shouldShowAdvancedDiagnostics,
} from "../../experience/dashboardDisclosure";
import { approvalRequestCenterService } from "../../services/provenance/ApprovalRequestCenterService";
import { memoryService } from "../../services/memoryService";
import { runtimeDiagnosticsService } from "../../services/runtime/RuntimeDiagnosticsService";
import { agentSessionContinuityService } from "../../services/runtime/AgentSessionContinuityService";
import type { LucaExperienceMode } from "../../experience/experienceMode";
import type { ApprovalRequest } from "../../types/approvalCenter";
import type { ToolExecutionLog } from "../../types";

/**
 * OperationCenter — the shell's right panel: one status line, then tabs.
 *
 * This was five always-mounted cards (System · Timeline · Memory · LucaLink ·
 * Permissions), four of which said nothing most of the time. The founder
 * decisions call that "the single biggest source of 'console at rest'", and the
 * acceptance criterion is "calm when empty, forward when needed". So the shape
 * inverts: one sentence at rest, and the panel only grows a card when something
 * genuinely needs a person.
 *
 * The tabs are NOT this component's own state. They read and write the
 * `rightPanelMode` App already owns and persists — the same value the mobile
 * right panel uses — so the two surfaces cannot drift into disagreeing about
 * where you are. `visibleModes` comes from `getVisibleRightPanelModes`, which is
 * why Trace appears for Creator only.
 *
 * Every number here is live: approvals decide through
 * `approvalRequestCenterService`, memory forgets through `memoryService`. Where a
 * source is genuinely empty the panel says so plainly rather than inventing a
 * row.
 */

/** Approvals are time-critical — someone is waiting on the answer. */
const APPROVALS_REFRESH_MS = 4000;
/** Everything else is a status read, not a queue. */
const AMBIENT_REFRESH_MS = 15000;
/** Fetched over the limit because system rows are filtered out afterwards. */
const MEMORY_FETCH = 24;
const MEMORY_LIMIT = 6;
const APPROVALS_SHOWN = 3;
const TRACE_LIMIT = 12;

const listPendingApprovals = (): ApprovalRequest[] => {
  try {
    return approvalRequestCenterService
      .listRequests()
      .filter((request) => request.status === "pending");
  } catch {
    return [];
  }
};

interface RecentMemory {
  id: string;
  /** What this memory is about — the structured label, else the humanised key. */
  label: string;
  /** What it says. */
  summary: string;
  when: string;
}

const relativeTime = (timestamp: number): string => {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
};

/** `USER_PREFERENCE_THEME` → `User preference theme`. */
const humanizeKey = (key: string): string => {
  const spaced = key.replace(/[_.]+/g, " ").replace(/\s+/g, " ").trim();
  if (!spaced) return "Remembered";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
};

/**
 * The panel's memory list, filtered the way the legacy Archive filters it.
 *
 * `getRecentIntelligence` returns raw nodes, so ambient-vision frames and system
 * instructions were surfacing in the old card verbatim — Luca's internal
 * scaffolding presented as something you had told it. `isRenderableMemory` is the
 * existing predicate for that, and the fetch runs over the limit because the
 * filter happens after the slice: three system rows in a row would otherwise
 * empty the tab.
 */
const listRecentMemory = (): RecentMemory[] => {
  try {
    return memoryService
      .getRecentIntelligence(MEMORY_FETCH)
      .filter(isRenderableMemory)
      .slice(0, MEMORY_LIMIT)
      .map((node) => {
        const formatted = formatMemoryValue(String(node.value ?? ""));
        return {
          id: node.id,
          label: formatted.label || humanizeKey(String(node.key ?? "")),
          summary: formatted.summary,
          when: relativeTime(Number(node.timestamp) || Date.now()),
        };
      });
  } catch {
    return [];
  }
};

/** Map a diagnostics severity to a semantic colour, defensively. */
const severityColor = (severity?: string): string => {
  const s = (severity ?? "").toLowerCase();
  if (["ready", "ok", "online", "healthy", "passed", "good"].includes(s)) return workspaceColor.good;
  if (["blocked", "error", "critical", "offline", "failed", "warning", "degraded", "pending"].includes(s)) return workspaceColor.warn;
  return workspaceColor.ink3;
};

const riskColor = (level: ApprovalRequest["riskLevel"]): string =>
  level === "high" || level === "critical" ? workspaceColor.warn : workspaceColor.ink3;

interface SystemRow {
  label: string;
  value: string;
  severity?: string;
}

interface ContinuityCounts {
  active: number;
  resumable: number;
  paused: number;
  quarantined: number;
  safeToResume: number;
}

const NO_SESSIONS: ContinuityCounts = {
  active: 0,
  resumable: 0,
  paused: 0,
  quarantined: 0,
  safeToResume: 0,
};

const readContinuity = (): ContinuityCounts => {
  try {
    const summary = agentSessionContinuityService.getDiagnosticsSummary();
    return {
      active: summary.activeSessions,
      resumable: summary.resumableSessions,
      paused: summary.pausedSessions,
      quarantined: summary.quarantinedSessions,
      safeToResume: summary.safeToResumeSessions,
    };
  } catch {
    return NO_SESSIONS;
  }
};

export interface OperationCenterProps {
  /** Supplied by WorkspaceShell. */
  onToggleCollapsed?: () => void;
  /** Frameless-window controls — the frame has no global header to hold them. */
  windowControls?: React.ReactNode;
  /** Health line from the app's own BIOS/introspection state. */
  systemStatus?: { label: string; healthy: boolean };
  /** Linked devices (LucaLink), passed from the shell if available. */
  linkedDeviceCount?: number;
  /** Drives which tabs exist and whether diagnostics rows are shown. */
  experienceMode?: LucaExperienceMode;
  /** The app's own persisted right-panel mode. Uncontrolled if omitted. */
  mode?: RightPanelMode;
  onModeChange?: (mode: RightPanelMode) => void;
  /** Defaults to the modes this experience mode allows. */
  visibleModes?: readonly RightPanelMode[];
  /** Tool calls, for the Creator-only Trace tab. */
  toolLogs?: ToolExecutionLog[];
}

export const OperationCenter: React.FC<OperationCenterProps> = ({
  onToggleCollapsed,
  windowControls,
  systemStatus,
  linkedDeviceCount = 0,
  experienceMode = "pro",
  mode,
  onModeChange,
  visibleModes,
  toolLogs = [],
}) => {
  const tabs = useMemo(
    () => visibleModes ?? getVisibleRightPanelModes(experienceMode),
    [visibleModes, experienceMode],
  );
  const [uncontrolledMode, setUncontrolledMode] = useState<RightPanelMode>("CONTROL");
  const requested = mode ?? uncontrolledMode;
  const activeMode: RightPanelMode = tabs.includes(requested)
    ? requested
    : tabs[0] ?? "CONTROL";
  const selectMode = useCallback(
    (next: RightPanelMode) => {
      setUncontrolledMode(next);
      onModeChange?.(next);
    },
    [onModeChange],
  );

  const showDiagnostics = shouldShowAdvancedDiagnostics(experienceMode);

  const [approvals, setApprovals] = useState<ApprovalRequest[]>(listPendingApprovals);
  const [memories, setMemories] = useState<RecentMemory[]>(listRecentMemory);
  const [sessions, setSessions] = useState<ContinuityCounts>(readContinuity);
  const [systemRows, setSystemRows] = useState<SystemRow[]>([]);

  /**
   * Approvals poll always, not just on the Now tab: the status line above the
   * tabs reports them, so someone reading Memory still learns that something is
   * waiting. Everything else polls only where it is visible — the old panel
   * refetched all five cards every four seconds regardless.
   */
  useEffect(() => {
    const tick = () => setApprovals(listPendingApprovals());
    tick();
    const timer = window.setInterval(tick, APPROVALS_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const tick = () => setSessions(readContinuity());
    tick();
    const timer = window.setInterval(tick, AMBIENT_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeMode !== "MEMORY") return;
    const tick = () => setMemories(listRecentMemory());
    tick();
    const timer = window.setInterval(tick, AMBIENT_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [activeMode]);

  // Runtime diagnostics is async, and Creator-only — don't fetch what no mode
  // will render.
  useEffect(() => {
    if (!showDiagnostics || activeMode !== "CONTROL") return;
    let alive = true;
    const tick = async () => {
      try {
        const d: any = await runtimeDiagnosticsService.getDiagnostics();
        if (!alive || !d) return;
        const rows: SystemRow[] = [];
        if (d.summary) rows.push({ label: "Runtime", value: String(d.summary.severity ?? "checking"), severity: d.summary.severity });
        if (d.routes?.chat) rows.push({ label: "Route", value: String(d.routes.chat.mode ?? d.routes.chat.label ?? "—"), severity: d.routes.chat.severity });
        if (d.memory) rows.push({ label: "Memory", value: String(d.memory.readiness ?? "").replace(/_/g, " ") || "—", severity: d.memory.severity });
        const voiceSev = [d.routes?.stt?.severity, d.routes?.tts?.severity].filter(Boolean);
        if (voiceSev.length) rows.push({ label: "Voice", value: voiceSev.includes("blocked") ? "blocked" : voiceSev.includes("warning") ? "warning" : "ready", severity: voiceSev.includes("blocked") ? "blocked" : "ready" });
        const running = d.governance?.runtimeContinuity?.loopStatus?.running;
        if (running !== undefined) rows.push({ label: "Continuity", value: running ? "running" : "idle", severity: running ? "ready" : "idle" });
        setSystemRows(rows);
      } catch {
        if (alive) setSystemRows([]);
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), AMBIENT_REFRESH_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [showDiagnostics, activeMode]);

  const handleApprove = useCallback((request: ApprovalRequest) => {
    approvalRequestCenterService.approveOnce(request.approvalRequestId);
    setApprovals(listPendingApprovals());
  }, []);

  const handleDeny = useCallback((request: ApprovalRequest) => {
    approvalRequestCenterService.reject(request.approvalRequestId);
    setApprovals(listPendingApprovals());
  }, []);

  /**
   * Forgetting is irreversible AND cross-device — `deleteMemory` syncs the delete
   * to every linked device and POSTs the new set to the core. So it confirms by
   * name and fails closed on decline, the same gate a conversation delete uses.
   */
  const handleForget = useCallback((memory: RecentMemory) => {
    const ok =
      typeof window === "undefined" ||
      typeof window.confirm !== "function" ||
      window.confirm(
        `Forget "${memory.label}"?\n\nThis removes it here and on every linked device, and cannot be undone.`,
      );
    if (!ok) return;
    try {
      memoryService.deleteMemory(memory.id);
    } catch {
      /* the refresh below reports the truth either way */
    }
    setMemories(listRecentMemory());
  }, []);

  const healthy = systemStatus?.healthy ?? true;
  /**
   * An offline core outranks the runtime headline: it is the most consequential
   * thing on the panel and the headline function knows nothing about it.
   */
  const headline = healthy
    ? friendlyRuntimeHeadline({
        pendingApprovals: approvals.length,
        quarantinedItems: sessions.quarantined,
      })
    : systemStatus?.label ?? "Local core offline";
  const headlineWarn = !healthy || approvals.length > 0 || sessions.quarantined > 0;

  const tabsId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  /** Left/Right walk the strip, as a tablist is supposed to. */
  const onTabKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (!delta) return;
      event.preventDefault();
      const at = tabs.indexOf(activeMode);
      const next = tabs[(at + delta + tabs.length) % tabs.length];
      if (!next) return;
      selectMode(next);
      tabRefs.current[next]?.focus();
    },
    [tabs, activeMode, selectMode],
  );

  return (
    <>
      <PanelHeader
        title="Operation Center"
        action={
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {onToggleCollapsed && (
              <CollapseToggle
                collapsed={false}
                onToggle={onToggleCollapsed}
                side="right"
                label="Collapse Operation Center"
              />
            )}
            {windowControls}
          </span>
        }
      />

      {/* The one sentence. Above the tabs, because it describes the panel and not
          whichever tab you happen to be reading. */}
      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 15px",
          fontSize: workspaceType.body,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            flex: "none",
            width: 15,
            height: 15,
            display: "grid",
            placeItems: "center",
            borderRadius: workspaceRadius.pill,
            fontSize: 9,
            color: headlineWarn ? workspaceColor.warn : workspaceColor.good,
            background: `color-mix(in srgb, ${headlineWarn ? workspaceColor.warn : workspaceColor.good} 16%, transparent)`,
          }}
        >
          {headlineWarn ? "!" : "✓"}
        </span>
        <span style={{ minWidth: 0, color: workspaceColor.ink }}>{headline}</span>
      </div>

      {/* Text with a 2px underline — a tab strip, not a row of chips. */}
      <div
        role="tablist"
        aria-label="Operation Center views"
        style={{
          flex: "none",
          display: "flex",
          gap: 2,
          padding: "0 11px",
          borderBottom: `1px solid ${workspaceColor.hairline}`,
        }}
      >
        {tabs.map((tab) => {
          const selected = tab === activeMode;
          const needsYou = tab === "CONTROL" && approvals.length > 0;
          return (
            <button
              key={tab}
              ref={(node) => {
                tabRefs.current[tab] = node;
              }}
              type="button"
              role="tab"
              id={`${tabsId}-${tab}`}
              aria-selected={selected}
              aria-controls={`${tabsId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectMode(tab)}
              onKeyDown={onTabKeyDown}
              className="luca-workspace-tab"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "8px 4px 7px",
                margin: "0 4px",
                border: 0,
                borderBottom: `2px solid ${selected ? workspaceColor.accent : "transparent"}`,
                background: "transparent",
                font: "inherit",
                fontSize: workspaceType.meta,
                fontWeight: 600,
                color: selected ? workspaceColor.ink : workspaceColor.ink3,
                cursor: "pointer",
              }}
            >
              {RIGHT_PANEL_LABELS[tab]}
              {needsYou && (
                <span
                  aria-hidden="true"
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: workspaceRadius.pill,
                    background: workspaceColor.warn,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        id={`${tabsId}-panel`}
        role="tabpanel"
        aria-labelledby={`${tabsId}-${activeMode}`}
        className="luca-workspace-scroll"
        style={{ flex: 1, paddingBottom: 12 }}
      >
        {activeMode === "CONTROL" && (
          <NowTab
            approvals={approvals}
            sessions={sessions}
            linkedDeviceCount={linkedDeviceCount}
            systemRows={showDiagnostics ? systemRows : []}
            onApprove={handleApprove}
            onDeny={handleDeny}
          />
        )}
        {activeMode === "ACTIVITY" && <TimelineTab sessions={sessions} />}
        {activeMode === "MEMORY" && (
          <MemoryTab memories={memories} onForget={handleForget} />
        )}
        {activeMode === "LOGS" && <TraceTab logs={toolLogs} />}
      </div>
    </>
  );
};

// ── Now ─────────────────────────────────────────────────────────────────────

const NowTab: React.FC<{
  approvals: ApprovalRequest[];
  sessions: ContinuityCounts;
  linkedDeviceCount: number;
  systemRows: SystemRow[];
  onApprove: (request: ApprovalRequest) => void;
  onDeny: (request: ApprovalRequest) => void;
}> = ({ approvals, sessions, linkedDeviceCount, systemRows, onApprove, onDeny }) => {
  const running = sessions.active > 0;
  const quiet = approvals.length === 0 && !running;

  return (
    <>
      {approvals.length > 0 && (
        <>
          {approvals.slice(0, APPROVALS_SHOWN).map((request) => (
            <ApprovalCard
              key={request.approvalRequestId}
              request={request}
              onApprove={onApprove}
              onDeny={onDeny}
            />
          ))}
          {approvals.length > APPROVALS_SHOWN && (
            <Note>
              {approvals.length - APPROVALS_SHOWN} more waiting — decide these first.
            </Note>
          )}
          <Note>Nothing runs until you decide.</Note>
        </>
      )}

      {running && (
        <ToneRow tone={workspaceColor.accent}>
          {sessions.active === 1 ? "1 session running" : `${sessions.active} sessions running`}
        </ToneRow>
      )}

      {quiet && <Note>Nothing running — Luca is standing by.</Note>}

      <SectionLabel>this device</SectionLabel>
      <Row>
        <span
          aria-hidden="true"
          style={{
            flex: "none",
            width: 24,
            height: 24,
            borderRadius: workspaceRadius.row,
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            color: workspaceColor.ink2,
            background: workspaceColor.hover,
          }}
        >
          🖥
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "block", fontSize: workspaceType.meta, color: workspaceColor.ink2 }}>
            Active session
          </span>
          <span style={{ display: "block", fontSize: workspaceType.label, color: workspaceColor.ink3 }}>
            {linkedDeviceCount > 0
              ? `${linkedDeviceCount} other ${linkedDeviceCount === 1 ? "device" : "devices"} linked`
              : "No other devices linked yet"}
          </span>
        </span>
        <span style={{ flex: "none", fontSize: workspaceType.label, color: workspaceColor.good }}>
          active
        </span>
      </Row>

      {systemRows.length > 0 && (
        <>
          <SectionLabel>diagnostics</SectionLabel>
          {systemRows.map((row) => (
            <Row key={row.label}>
              <span style={{ flex: 1, fontSize: workspaceType.meta, color: workspaceColor.ink3 }}>
                {row.label}
              </span>
              <span
                aria-hidden="true"
                style={{
                  flex: "none",
                  width: 6,
                  height: 6,
                  borderRadius: workspaceRadius.pill,
                  background: severityColor(row.severity),
                }}
              />
              <span
                style={{
                  flex: "none",
                  fontSize: workspaceType.meta,
                  color: workspaceColor.ink2,
                  textTransform: "capitalize",
                }}
              >
                {row.value}
              </span>
            </Row>
          ))}
        </>
      )}
    </>
  );
};

/**
 * The one thing on this panel allowed to be a bordered, tinted box.
 *
 * Everything else is a flat row, so "something needs you" is carried by the
 * geometry and not by a colour a person has to learn. `requestedBy · sourceType`
 * is on it deliberately: the safety spec requires side effects be provenanced,
 * and provenance you cannot see is not provenance.
 */
const ApprovalCard: React.FC<{
  request: ApprovalRequest;
  onApprove: (request: ApprovalRequest) => void;
  onDeny: (request: ApprovalRequest) => void;
}> = ({ request, onApprove, onDeny }) => (
  <section
    style={{
      margin: "11px 12px",
      padding: 12,
      borderRadius: workspaceRadius.card,
      border: `1px solid color-mix(in srgb, ${workspaceColor.warn} 42%, transparent)`,
      background: `color-mix(in srgb, ${workspaceColor.warn} 9%, transparent)`,
    }}
  >
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span
        style={{
          minWidth: 0,
          flex: 1,
          fontSize: workspaceType.meta,
          fontWeight: 600,
          color: workspaceColor.ink,
        }}
      >
        {request.title}
      </span>
      <span
        style={{
          flex: "none",
          fontSize: workspaceType.label,
          color: riskColor(request.riskLevel),
        }}
      >
        {request.riskLevel} risk
      </span>
    </div>
    <p
      style={{
        margin: "4px 0 0",
        fontSize: workspaceType.meta,
        lineHeight: 1.5,
        color: workspaceColor.ink2,
      }}
    >
      {request.userSafeReason || request.description}
    </p>
    <div style={{ marginTop: 4, fontSize: workspaceType.label, color: workspaceColor.ink3 }}>
      {request.requestedBy} · {request.sourceType}
    </div>
    <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
      {/* "Allow once" and "Deny", not the mockup's "Review"/"Not now": these
          buttons decide, they do not open anything, and a permission control that
          understates what it does is the one thing the safety spec singles out.
          "once" is literal — the service method is `approveOnce`. */}
      <ApprovalButton primary onClick={() => onApprove(request)}>
        Allow once
      </ApprovalButton>
      <ApprovalButton onClick={() => onDeny(request)}>Deny</ApprovalButton>
    </div>
  </section>
);

const ApprovalButton: React.FC<{
  children: React.ReactNode;
  primary?: boolean;
  onClick: () => void;
}> = ({ children, primary = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="luca-workspace-toggle"
    style={{
      flex: 1,
      padding: 6,
      border: `1px solid ${primary ? "transparent" : workspaceColor.hairline}`,
      borderRadius: 6,
      font: "inherit",
      fontSize: workspaceType.meta,
      fontWeight: 600,
      cursor: "pointer",
      color: primary ? "#fff" : workspaceColor.ink2,
      background: primary ? workspaceColor.accent : "transparent",
    }}
  >
    {children}
  </button>
);

// ── Timeline ────────────────────────────────────────────────────────────────

/**
 * Every non-zero continuity bucket, one row each.
 *
 * No arithmetic between the buckets: `pausedSessions` and `safeToResumeSessions`
 * come from different predicates in the service, so subtracting one from the
 * other would invent a number. And no timestamps — the source is a counts
 * summary with no event times in it, and a fabricated "2m ago" would be worse
 * than none.
 *
 * This tab is empty on every install today, because
 * `agentSessionContinuityService.createSession` still has no caller anywhere in
 * the repo. That is a missing writer, not a broken reader.
 */
const TimelineTab: React.FC<{ sessions: ContinuityCounts }> = ({ sessions }) => {
  const rows: Array<{ tone: string; text: string }> = [];
  if (sessions.quarantined > 0) {
    rows.push({
      tone: workspaceColor.warn,
      text: `${sessions.quarantined} quarantined · needs review`,
    });
  }
  if (sessions.active > 0) {
    rows.push({ tone: workspaceColor.accent, text: `${sessions.active} running` });
  }
  if (sessions.safeToResume > 0) {
    rows.push({
      tone: workspaceColor.good,
      text: `${sessions.safeToResume} safe to resume`,
    });
  }
  if (sessions.resumable > 0) {
    rows.push({ tone: workspaceColor.ink3, text: `${sessions.resumable} resumable` });
  }
  if (sessions.paused > 0) {
    rows.push({ tone: workspaceColor.ink3, text: `${sessions.paused} paused` });
  }

  if (rows.length === 0) {
    return <Note>No agent sessions yet — nothing has been paused or resumed.</Note>;
  }

  return (
    <>
      {rows.map((row) => (
        <ToneRow key={row.text} tone={row.tone}>
          {row.text}
        </ToneRow>
      ))}
    </>
  );
};

// ── Memory ──────────────────────────────────────────────────────────────────

const MemoryTab: React.FC<{
  memories: RecentMemory[];
  onForget: (memory: RecentMemory) => void;
}> = ({ memories, onForget }) => {
  if (memories.length === 0) {
    return <Note>Nothing kept yet. What Luca remembers will appear here.</Note>;
  }
  return (
    <>
      {memories.map((memory) => (
        <div
          key={memory.id}
          className="luca-reveal-row"
          style={{ padding: "8px 15px", display: "flex", alignItems: "flex-start", gap: 8 }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                fontSize: workspaceType.meta,
                color: workspaceColor.ink2,
              }}
            >
              <span
                style={{
                  minWidth: 0,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {memory.label}
              </span>
              <span style={{ flex: "none", fontSize: workspaceType.label, color: workspaceColor.ink3 }}>
                {memory.when}
              </span>
            </div>
            {memory.summary && (
              <div
                style={{
                  marginTop: 2,
                  fontSize: workspaceType.label,
                  lineHeight: 1.45,
                  color: workspaceColor.ink3,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {memory.summary}
              </div>
            )}
          </div>
          {/* Hidden at rest, revealed by hover OR focus-within, so a destructive
              control is never mouse-only. */}
          <button
            type="button"
            onClick={() => onForget(memory)}
            className="luca-workspace-toggle luca-reveal-action"
            aria-label={`Forget ${memory.label}`}
            style={{
              flex: "none",
              padding: "2px 7px",
              border: `1px solid ${workspaceColor.hairline}`,
              borderRadius: workspaceRadius.pill,
              font: "inherit",
              fontSize: workspaceType.label,
              color: workspaceColor.ink3,
              background: "transparent",
              cursor: "pointer",
            }}
          >
            Forget
          </button>
        </div>
      ))}
      <Note>Only you can change what I remember.</Note>
    </>
  );
};

// ── Trace ───────────────────────────────────────────────────────────────────

const TraceTab: React.FC<{ logs: ToolExecutionLog[] }> = ({ logs }) => {
  if (logs.length === 0) {
    return <Note>No tool calls yet. Everything Luca runs shows up here.</Note>;
  }
  return (
    <>
      {logs
        .slice(-TRACE_LIMIT)
        .reverse()
        .map((log, index) => (
          <div key={`${log.timestamp}-${log.toolName}-${index}`} style={{ padding: "8px 15px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                fontSize: workspaceType.meta,
                color: workspaceColor.ink2,
              }}
            >
              <span style={{ minWidth: 0, flex: 1, fontWeight: 600 }}>{log.toolName}</span>
              <span style={{ flex: "none", fontSize: workspaceType.label, color: workspaceColor.ink3 }}>
                {relativeTime(log.timestamp)}
              </span>
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: workspaceType.label,
                lineHeight: 1.45,
                color: workspaceColor.ink3,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {summarizeToolLog(log)}
            </div>
          </div>
        ))}
    </>
  );
};

// ── Shared bits ─────────────────────────────────────────────────────────────

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 15px" }}>
    {children}
  </div>
);

const ToneRow: React.FC<{ tone: string; children: React.ReactNode }> = ({ tone, children }) => (
  <Row>
    <span
      aria-hidden="true"
      style={{
        flex: "none",
        width: 6,
        height: 6,
        borderRadius: workspaceRadius.pill,
        background: tone,
      }}
    />
    <span style={{ minWidth: 0, fontSize: workspaceType.meta, color: workspaceColor.ink2 }}>
      {children}
    </span>
  </Row>
);

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p
    style={{
      margin: 0,
      padding: "10px 15px",
      fontSize: workspaceType.meta,
      lineHeight: 1.5,
      color: workspaceColor.ink3,
    }}
  >
    {children}
  </p>
);

export default OperationCenter;
