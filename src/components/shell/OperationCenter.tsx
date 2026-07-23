import React, { useCallback, useEffect, useState } from "react";
import { PanelCard, PanelHeader, CollapseToggle } from "./WorkspacePrimitives";
import { workspaceColor, workspaceType } from "./workspaceShellTokens";
import { approvalRequestCenterService } from "../../services/provenance/ApprovalRequestCenterService";
import { memoryService } from "../../services/memoryService";
import type { ApprovalRequest } from "../../types/approvalCenter";

/**
 * OperationCenter — the shell's right panel: the present tense.
 *
 * What is live RIGHT NOW — system health, what just happened, what Luca is
 * holding in mind, and what is waiting on you. That is the whole division of
 * labour with the overview: this panel reports state; the centre asks what you
 * want to do next. Neither should narrate the other's job.
 *
 * Everything here reads a real service. Where a service does not exist yet the
 * card says so plainly rather than showing plausible fixtures — a panel that
 * invents a timeline is worse than one that admits it has none, because the
 * invented one is believed.
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

export interface OperationCenterProps {
  /** Supplied by WorkspaceShell. */
  onToggleCollapsed?: () => void;
  /** Frameless-window controls — the shell has no global header to hold them. */
  windowControls?: React.ReactNode;
  /** Health line from the app's own BIOS/introspection state. */
  systemStatus?: { label: string; healthy: boolean };
}

export const OperationCenter: React.FC<OperationCenterProps> = ({
  onToggleCollapsed,
  windowControls,
  systemStatus,
}) => {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(listPendingApprovals);
  const [memories, setMemories] = useState<RecentMemory[]>(listRecentMemory);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setApprovals(listPendingApprovals());
      setMemories(listRecentMemory());
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

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
                background: `color-mix(in srgb, ${
                  healthy ? workspaceColor.good : workspaceColor.warn
                } 16%, transparent)`,
              }}
            >
              {healthy ? "✓" : "!"}
            </span>
            <span style={{ color: workspaceColor.ink }}>
              {systemStatus?.label ?? "All systems operational"}
            </span>
          </div>
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
                <div style={{ marginTop: 1, fontSize: "10.5px", color: workspaceColor.ink3 }}>
                  {memory.when}
                </div>
              </div>
            ))
          )}
        </PanelCard>

        <PanelCard label={`Permissions${approvals.length ? ` · ${approvals.length}` : ""}`}>
          {approvals.length === 0 ? (
            <EmptyNote>Nothing waiting on you.</EmptyNote>
          ) : (
            approvals.slice(0, 3).map((request) => (
              <div key={request.approvalRequestId} style={{ marginBottom: 10 }}>
                <div
                  style={{
                    fontSize: workspaceType.meta,
                    fontWeight: 600,
                    color: workspaceColor.ink,
                  }}
                >
                  {request.title}
                </div>
                {/* userSafeReason is the plain-language "why", written for the
                    person deciding — preferred over the technical description. */}
                <div
                  style={{
                    marginTop: 3,
                    fontSize: workspaceType.meta,
                    lineHeight: 1.5,
                    color: workspaceColor.ink2,
                  }}
                >
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

const EmptyNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p
    style={{
      margin: 0,
      fontSize: workspaceType.meta,
      lineHeight: 1.5,
      color: workspaceColor.ink3,
    }}
  >
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
