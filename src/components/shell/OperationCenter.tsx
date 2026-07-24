import React, { useCallback, useEffect, useState } from "react";
import { PanelCard, PanelHeader, CollapseToggle } from "./WorkspacePrimitives";
import { workspaceColor, workspaceType } from "./workspaceShellTokens";
import { approvalRequestCenterService } from "../../services/provenance/ApprovalRequestCenterService";
import { memoryService } from "../../services/memoryService";
import { runtimeDiagnosticsService } from "../../services/runtime/RuntimeDiagnosticsService";
import { agentSessionContinuityService } from "../../services/runtime/AgentSessionContinuityService";
import type { ApprovalRequest } from "../../types/approvalCenter";

/**
 * OperationCenter — the shell's right panel: the present tense.
 *
 * Five cards, all backed by the same real services the legacy shell reads, so
 * the panel reports live state rather than sitting empty:
 *   System      ← runtimeDiagnosticsService (Runtime / Route / Memory / Voice / Continuity)
 *   Timeline    ← agentSessionContinuityService (what is running / resumable now)
 *   Memory      ← memoryService.getRecentIntelligence
 *   LucaLink    ← this host + linked devices (session handoff surface)
 *   Permissions ← approvalRequestCenterService (live Allow / Deny)
 *
 * Where a feature has no backend yet the card says so plainly; nothing here is
 * fixture data. Presentational — approvals decide through the real service; the
 * rest is read-only.
 */

const REFRESH_MS = 4000;
const MEMORY_LIMIT = 3;

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
  label: string;
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

const listRecentMemory = (): RecentMemory[] => {
  try {
    return memoryService.getRecentIntelligence(MEMORY_LIMIT).map((node: any) => ({
      id: String(node.id ?? node.timestamp),
      label: String(node.title ?? node.content ?? "Untitled").slice(0, 64),
      when: relativeTime(Number(node.timestamp) || Date.now()),
    }));
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

interface SystemRow {
  label: string;
  value: string;
  severity?: string;
}

interface TimelineState {
  running: number;
  resumable: number;
}

export interface OperationCenterProps {
  /** Supplied by WorkspaceShell. */
  onToggleCollapsed?: () => void;
  /** Frameless-window controls — the frame has no global header to hold them. */
  windowControls?: React.ReactNode;
  /** Health line from the app's own BIOS/introspection state. */
  systemStatus?: { label: string; healthy: boolean };
  /** Linked devices (LucaLink), passed from the shell if available. */
  linkedDeviceCount?: number;
}

export const OperationCenter: React.FC<OperationCenterProps> = ({
  onToggleCollapsed,
  windowControls,
  systemStatus,
  linkedDeviceCount = 0,
}) => {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(listPendingApprovals);
  const [memories, setMemories] = useState<RecentMemory[]>(listRecentMemory);
  const [systemRows, setSystemRows] = useState<SystemRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineState>({ running: 0, resumable: 0 });

  const refreshSync = useCallback(() => {
    setApprovals(listPendingApprovals());
    setMemories(listRecentMemory());
    try {
      const sessions: any = agentSessionContinuityService.getDiagnosticsSummary();
      setTimeline({
        running: sessions.activeSessions ?? 0,
        resumable: sessions.safeToResumeSessions ?? sessions.resumableSessions ?? 0,
      });
    } catch {
      /* leave last known */
    }
  }, []);

  // Runtime diagnostics is async; poll it into the System rows.
  const refreshDiagnostics = useCallback(async () => {
    try {
      const d: any = await runtimeDiagnosticsService.getDiagnostics();
      if (!d) return;
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
      setSystemRows([]);
    }
  }, []);

  useEffect(() => {
    refreshSync();
    void refreshDiagnostics();
    const timer = window.setInterval(() => {
      refreshSync();
      void refreshDiagnostics();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refreshSync, refreshDiagnostics]);

  const handleApprove = useCallback((request: ApprovalRequest) => {
    approvalRequestCenterService.approveOnce(request.approvalRequestId);
    setApprovals(listPendingApprovals());
  }, []);

  const handleDeny = useCallback((request: ApprovalRequest) => {
    approvalRequestCenterService.reject(request.approvalRequestId);
    setApprovals(listPendingApprovals());
  }, []);

  const healthy = systemStatus?.healthy ?? true;

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

      <div className="luca-workspace-scroll" style={{ flex: 1 }}>
        <PanelCard label="System">
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: workspaceType.body }}>
            <span
              aria-hidden="true"
              style={{
                flex: "none",
                width: 15,
                height: 15,
                display: "grid",
                placeItems: "center",
                borderRadius: 999,
                fontSize: 9,
                color: healthy ? workspaceColor.good : workspaceColor.warn,
                background: `color-mix(in srgb, ${healthy ? workspaceColor.good : workspaceColor.warn} 16%, transparent)`,
              }}
            >
              {healthy ? "✓" : "!"}
            </span>
            <span style={{ color: workspaceColor.ink }}>
              {systemStatus?.label ?? "All systems operational"}
            </span>
          </div>
          {systemRows.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {systemRows.map((row) => (
                <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: workspaceType.meta }}>
                  <span style={{ color: workspaceColor.ink3, width: 66, flex: "none" }}>{row.label}</span>
                  <span style={{ flex: 1 }} />
                  <span
                    aria-hidden="true"
                    style={{ width: 6, height: 6, borderRadius: 999, background: severityColor(row.severity), flex: "none" }}
                  />
                  <span style={{ color: workspaceColor.ink2, textTransform: "capitalize" }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </PanelCard>

        <PanelCard label="Timeline">
          {timeline.running === 0 && timeline.resumable === 0 ? (
            <EmptyNote>Nothing running — Luca is standing by.</EmptyNote>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {timeline.running > 0 && (
                <TimelineRow
                  dot={workspaceColor.accent}
                  label={`${timeline.running} ${timeline.running === 1 ? "session" : "sessions"} running`}
                />
              )}
              {timeline.resumable > 0 && (
                <TimelineRow
                  dot={workspaceColor.ink3}
                  label={`${timeline.resumable} paused · safe to resume`}
                />
              )}
            </div>
          )}
        </PanelCard>

        <PanelCard label="Memory">
          {memories.length === 0 ? (
            <EmptyNote>Nothing kept yet. What Luca remembers will appear here.</EmptyNote>
          ) : (
            memories.map((memory) => (
              <div key={memory.id} style={{ padding: "6px 0" }}>
                <div
                  style={{
                    fontSize: workspaceType.meta,
                    color: workspaceColor.ink2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {memory.label}
                </div>
                <div style={{ marginTop: 1, fontSize: "10.5px", color: workspaceColor.ink3 }}>{memory.when}</div>
              </div>
            ))
          )}
        </PanelCard>

        <PanelCard label="LucaLink">
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span
              aria-hidden="true"
              style={{
                flex: "none",
                width: 26,
                height: 26,
                borderRadius: 7,
                display: "grid",
                placeItems: "center",
                fontSize: 13,
                color: workspaceColor.ink2,
                background: workspaceColor.hover,
              }}
            >
              🖥
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: workspaceType.meta, color: workspaceColor.ink2 }}>This device</span>
              <span style={{ display: "block", fontSize: "10.5px", color: workspaceColor.ink3 }}>Active session</span>
            </span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: "10.5px", color: workspaceColor.good }}>active</span>
          </div>
          <div style={{ marginTop: 8, fontSize: "10.5px", color: workspaceColor.ink3 }}>
            {linkedDeviceCount > 0
              ? `${linkedDeviceCount} linked ${linkedDeviceCount === 1 ? "device" : "devices"}`
              : "No other devices linked yet — pair one via LucaLink."}
          </div>
        </PanelCard>

        <PanelCard label={`Permissions${approvals.length ? ` · ${approvals.length}` : ""}`}>
          {approvals.length === 0 ? (
            <EmptyNote>Nothing waiting on you.</EmptyNote>
          ) : (
            approvals.slice(0, 3).map((request) => (
              <div key={request.approvalRequestId} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: workspaceType.meta, fontWeight: 600, color: workspaceColor.ink }}>
                  {request.title}
                </div>
                <div style={{ marginTop: 3, fontSize: workspaceType.meta, lineHeight: 1.5, color: workspaceColor.ink2 }}>
                  {request.userSafeReason || request.description}
                </div>
                <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
                  <ApprovalButton primary onClick={() => handleApprove(request)}>
                    Allow
                  </ApprovalButton>
                  <ApprovalButton onClick={() => handleDeny(request)}>Deny</ApprovalButton>
                </div>
              </div>
            ))
          )}
        </PanelCard>
      </div>
    </>
  );
};

const TimelineRow: React.FC<{ dot: string; label: string }> = ({ dot, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: workspaceType.meta, color: workspaceColor.ink2 }}>
    <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, background: dot, flex: "none" }} />
    {label}
  </div>
);

const EmptyNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ margin: 0, fontSize: workspaceType.meta, lineHeight: 1.5, color: workspaceColor.ink3 }}>
    {children}
  </p>
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

export default OperationCenter;
