import React from "react";
import {
  WORKSPACE_DURATION_MS,
  WORKSPACE_EASE,
  workspaceColor,
  workspaceType,
} from "./workspaceShellTokens";
import { WORKSPACE_INTERACTION_CSS } from "./WorkspacePrimitives";
import { useWorkspacePanels } from "./useWorkspacePanels";

/**
 * WorkspaceShell — the frame the whole app lives in.
 *
 * Columns: sidebar · centre · [canvas] · operation centre. The seams are the
 * grid's own 1px gaps painted with the hairline colour, so no column owns a
 * border and none can disagree with its neighbour.
 *
 * The frame is the constant. Switching between overview and working swaps only
 * the CENTRE — the sidebar and operation centre never move — which is what
 * makes changing context cost nothing visually. The same discipline the boot
 * loader earned, applied to the whole app.
 *
 * There is deliberately NO global header: every panel carries its own. On
 * Windows that leaves the frameless window's controls homeless, so the shell
 * accepts `windowControls` and seats them in the top-right panel — the only
 * place they can sit without a titlebar to hold them.
 *
 * Collapse is per-person, per-moment (see useWorkspacePanels). The sidebar
 * folds to a rail so navigation never fully disappears; the operation centre
 * leaves entirely, because "give me room" should mean it, and returns via a
 * handle that carries its pending count — hiding a panel must never hide the
 * fact that something needs you.
 */

const SIDEBAR_WIDTH = 232;
const SIDEBAR_RAIL = 58;
const OPS_WIDTH = 286;

export interface WorkspaceShellProps {
  sidebar: React.ReactNode;
  centre: React.ReactNode;
  /** The document canvas. Absent in overview mode. */
  canvas?: React.ReactNode;
  operationCenter?: React.ReactNode;
  /** Count surfaced on the restore handle while the ops centre is closed. */
  pendingCount?: number;
  /** Frameless-window controls, seated in the top-right panel. */
  windowControls?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  sidebar,
  centre,
  canvas,
  operationCenter,
  pendingCount = 0,
  windowControls,
  className,
  style,
}) => {
  const { sidebarCollapsed, opsCollapsed, compact, toggleSidebar, toggleOps } =
    useWorkspacePanels();

  const hasCanvas = Boolean(canvas);
  const hasOps = Boolean(operationCenter);

  // Compact viewports carry the centre alone; the stored collapse preference
  // is left untouched so widening restores exactly what the user had.
  const columns = compact
    ? "1fr"
    : [
        `${sidebarCollapsed ? SIDEBAR_RAIL : SIDEBAR_WIDTH}px`,
        "minmax(320px, 1fr)",
        hasCanvas ? "minmax(300px, 1.05fr)" : null,
        hasOps ? `${opsCollapsed ? 0 : OPS_WIDTH}px` : null,
      ]
        .filter(Boolean)
        .join(" ");

  return (
    <div
      data-luca-workspace-shell
      data-sidebar={sidebarCollapsed ? "rail" : "open"}
      data-ops={opsCollapsed ? "closed" : "open"}
      data-compact={compact ? "true" : "false"}
      className={`luca-workspace-grid ${className ?? ""}`}
      style={{
        display: "grid",
        gridTemplateColumns: columns,
        gap: 1,
        background: workspaceColor.hairline,
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        transition: `grid-template-columns ${WORKSPACE_DURATION_MS}ms ${WORKSPACE_EASE}`,
        ...style,
      }}
    >
      <style>{WORKSPACE_INTERACTION_CSS}</style>

      {!compact && (
        <WorkspaceColumn>
          {React.isValidElement(sidebar)
            ? React.cloneElement(sidebar as React.ReactElement<any>, {
                collapsed: sidebarCollapsed,
                onToggleCollapsed: toggleSidebar,
              })
            : sidebar}
        </WorkspaceColumn>
      )}

      <WorkspaceColumn style={{ position: "relative" }}>
        {/* Only present once the operation centre is away. */}
        {!compact && hasOps && opsCollapsed && (
          <button
            type="button"
            onClick={toggleOps}
            className="luca-workspace-handle"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 30,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 11px",
              border: `1px solid ${workspaceColor.hairline}`,
              borderRadius: 999,
              background: workspaceColor.hover,
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              color: workspaceColor.ink2,
              font: "inherit",
              fontSize: workspaceType.meta,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {pendingCount > 0 && (
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: workspaceColor.warn,
                  flex: "none",
                }}
              />
            )}
            Operation Center
            {pendingCount > 0 ? ` · ${pendingCount}` : ""}
          </button>
        )}
        {centre}
      </WorkspaceColumn>

      {!compact && hasCanvas && <WorkspaceColumn>{canvas}</WorkspaceColumn>}

      {!compact && hasOps && (
        <WorkspaceColumn
          aria-hidden={opsCollapsed ? "true" : undefined}
          style={opsCollapsed ? { visibility: "hidden" } : undefined}
        >
          {React.isValidElement(operationCenter)
            ? React.cloneElement(operationCenter as React.ReactElement<any>, {
                onToggleCollapsed: toggleOps,
                windowControls,
              })
            : operationCenter}
        </WorkspaceColumn>
      )}
    </div>
  );
};

/** One column: independent scroll, hairline seam supplied by the grid gap. */
const WorkspaceColumn: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  "aria-hidden"?: "true";
}> = ({ children, style, ...rest }) => (
  <div
    {...rest}
    style={{
      display: "flex",
      flexDirection: "column",
      minWidth: 0,
      overflow: "hidden",
      background:
        "var(--luca-background-elevated, var(--luca-background-base, transparent))",
      ...style,
    }}
  >
    {children}
  </div>
);

export default WorkspaceShell;
