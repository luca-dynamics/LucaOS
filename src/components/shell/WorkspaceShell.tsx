import React, { useCallback, useRef, useState } from "react";
import {
  WORKSPACE_DURATION_MS,
  WORKSPACE_EASE,
  workspaceColor,
  workspaceRadius,
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
 *
 * Edges are grammar, not decoration. The frame is FLUSH — panels meet on a
 * hairline seam with no gutter and no radius — and only two things are rounded:
 * the shell's own outer boundary, which nests with the window, and surfaces that
 * ARRIVED (the tools overlay). Square therefore means structure that was always
 * there; rounded means something summoned, that Escape will dismiss.
 */

const SIDEBAR_WIDTH = 232;
const SIDEBAR_RAIL = 58;
const OPS_WIDTH = 286;

// Drag-to-resize bounds. The panels never shrink past readable, nor grow so far
// they starve the centre.
const SIDEBAR_MIN = 190;
const SIDEBAR_MAX = 400;
const OPS_MIN = 240;
const OPS_MAX = 480;

const SIDEBAR_WIDTH_KEY = "luca.ws.sidebarWidth";
const OPS_WIDTH_KEY = "luca.ws.opsWidth";

const clampWidth = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Read a persisted panel width, clamped to its bounds; fall back if absent. */
const readStoredWidth = (
  key: string,
  fallback: number,
  min: number,
  max: number,
): number => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = Number(window.localStorage.getItem(key));
    return Number.isFinite(raw) && raw > 0 ? clampWidth(raw, min, max) : fallback;
  } catch {
    return fallback;
  }
};

export interface WorkspaceShellProps {
  sidebar: React.ReactNode;
  centre: React.ReactNode;
  /** The document canvas. Absent in overview mode. */
  canvas?: React.ReactNode;
  operationCenter?: React.ReactNode;
  /** Count surfaced on the restore handle while the ops centre is closed. */
  pendingCount?: number;
  /**
   * The environment controls cluster (credits, quick controls, connection,
   * settings…). Seated in a thin bar at the top of the centre column, sharing
   * that row with the Operation Center restore handle — so the two never
   * collide the way a floating handle over a header would.
   */
  centreHeader?: React.ReactNode;
  /** Frameless-window controls, seated in the top-right panel. */
  windowControls?: React.ReactNode;
  /**
   * Where the operation centre starts for someone who has never collapsed it.
   * Forwarded verbatim to `useWorkspacePanels`, so a stored preference always
   * wins — see its own doc comment.
   */
  defaultOpsCollapsed?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  sidebar,
  centre,
  canvas,
  operationCenter,
  pendingCount = 0,
  centreHeader,
  windowControls,
  defaultOpsCollapsed = false,
  className,
  style,
}) => {
  const { sidebarCollapsed, opsCollapsed, compact, toggleSidebar, toggleOps } =
    useWorkspacePanels({ defaultOpsCollapsed });

  const hasCanvas = Boolean(canvas);
  const hasOps = Boolean(operationCenter);

  // Panel widths are the user's to set: drag a seam, and the width sticks
  // (localStorage) so the frame reopens the way they left it.
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    readStoredWidth(SIDEBAR_WIDTH_KEY, SIDEBAR_WIDTH, SIDEBAR_MIN, SIDEBAR_MAX),
  );
  const [opsWidth, setOpsWidth] = useState(() =>
    readStoredWidth(OPS_WIDTH_KEY, OPS_WIDTH, OPS_MIN, OPS_MAX),
  );
  const [resizing, setResizing] = useState(false);

  // Refs so the pointer-move handler always reads the live width, never a stale
  // closure capture.
  const sidebarWidthRef = useRef(sidebarWidth);
  sidebarWidthRef.current = sidebarWidth;
  const opsWidthRef = useRef(opsWidth);
  opsWidthRef.current = opsWidth;

  const beginResize = useCallback(
    (which: "sidebar" | "ops", startClientX: number) => {
      const startSidebar = sidebarWidthRef.current;
      const startOps = opsWidthRef.current;
      setResizing(true);
      const onMove = (event: PointerEvent) => {
        const dx = event.clientX - startClientX;
        if (which === "sidebar") {
          setSidebarWidth(clampWidth(startSidebar + dx, SIDEBAR_MIN, SIDEBAR_MAX));
        } else {
          // The ops panel lives on the right, so dragging its seam LEFT (dx < 0)
          // grows it.
          setOpsWidth(clampWidth(startOps - dx, OPS_MIN, OPS_MAX));
        }
      };
      const onUp = () => {
        setResizing(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        try {
          window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidthRef.current));
          window.localStorage.setItem(OPS_WIDTH_KEY, String(opsWidthRef.current));
        } catch {
          /* storage unavailable — the width still holds for this session */
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [],
  );

  // Compact viewports carry the centre alone; the stored collapse preference
  // is left untouched so widening restores exactly what the user had.
  const columns = compact
    ? "1fr"
    : [
        `${sidebarCollapsed ? SIDEBAR_RAIL : sidebarWidth}px`,
        "minmax(320px, 1fr)",
        hasCanvas ? "minmax(300px, 1.05fr)" : null,
        hasOps ? `${opsCollapsed ? 0 : opsWidth}px` : null,
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
        // Fill the height explicitly. Without a row track the grid's single
        // implicit row is content-height and sits at the top (align-content
        // defaults to start), so the whole shell rendered in a ~500px band with
        // empty space below — the "half-screen" window. One row of minmax(0,1fr)
        // stretches the columns to the full height; minmax(0,…) lets each
        // column's own overflow scroll instead of forcing the grid taller.
        gridTemplateRows: "minmax(0, 1fr)",
        gap: 1,
        background: workspaceColor.hairline,
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        // Nested corners on a flush frame. Inside, nothing changes: no gutters,
        // no per-panel inset, seams still the grid's own 1px hairline gap. Only
        // the shell's OUTER boundary curves, so the outermost panels arc with
        // the window instead of running square into it. The columns clip to it
        // for free — the grid already owns `overflow: hidden`. This is the first
        // use of `workspaceRadius.panel`, which was defined for exactly this and
        // never adopted; `src/index.css` gives inline `border-radius: 12px`
        // continuous curvature, so the arc is a squircle, not a circle.
        //
        // The spread shadow is structure, not decoration: it fills the crescent
        // between the arc and the square border box with the app's own ground.
        // Nothing else would. On Electron `documentElement`/`body` are set to
        // `transparent` (App.tsx), the dashboard container is `transparent` by
        // platform policy, and the only layer behind is LiquidBackground, which
        // paints base at `--app-bg-opacity` (0.3 by default) — so the corners
        // would otherwise drift with the transparency slider toward the frameless
        // window's own light `#e2edf2`. A 0-offset/0-blur spread follows the
        // radius outward, painting exactly that crescent; the rest of the ring
        // falls outside the window and is clipped away. `overflow: hidden` clips
        // descendants, never the element's own shadow.
        borderRadius: workspaceRadius.panel,
        boxShadow: `0 0 0 ${workspaceRadius.panel}px var(--luca-background-base, transparent)`,
        // While dragging a seam the columns must track the pointer 1:1, so the
        // easing transition is suspended for the duration of the drag.
        transition: resizing
          ? "none"
          : `grid-template-columns ${WORKSPACE_DURATION_MS}ms ${WORKSPACE_EASE}`,
        userSelect: resizing ? "none" : undefined,
        ...style,
      }}
    >
      <style>{WORKSPACE_INTERACTION_CSS}</style>

      {!compact && (
        <WorkspaceColumn style={{ position: "relative" }}>
          {React.isValidElement(sidebar)
            ? React.cloneElement(sidebar as React.ReactElement<any>, {
                collapsed: sidebarCollapsed,
                onToggleCollapsed: toggleSidebar,
                onToggleOps: hasOps ? toggleOps : undefined,
              })
            : sidebar}
          {!sidebarCollapsed && (
            <ResizeHandle
              side="right"
              onStart={(x) => beginResize("sidebar", x)}
              label="Resize sidebar"
            />
          )}
        </WorkspaceColumn>
      )}

      <WorkspaceColumn>
        {/* The centre's own top bar: environment controls on the right, and the
            Operation Center restore handle beside them once the panel is away —
            one in-flow row, so nothing floats over anything. */}
        {(centreHeader || (!compact && hasOps && opsCollapsed)) && (
          <div
            style={{
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              minHeight: 46,
              padding: "6px 12px",
            }}
          >
            <div style={{ minWidth: 0, display: "flex", alignItems: "center" }}>
              {centreHeader}
            </div>
            {!compact && hasOps && opsCollapsed && (
              <button
                type="button"
                onClick={toggleOps}
                className="luca-workspace-handle"
                style={{
                  flex: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "6px 11px",
                  border: `1px solid ${workspaceColor.hairline}`,
                  borderRadius: 999,
                  background: workspaceColor.hover,
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
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", flexDirection: "column" }}>
          {centre}
        </div>
      </WorkspaceColumn>

      {!compact && hasCanvas && <WorkspaceColumn>{canvas}</WorkspaceColumn>}

      {!compact && hasOps && (
        <WorkspaceColumn
          aria-hidden={opsCollapsed ? "true" : undefined}
          style={
            opsCollapsed
              ? { visibility: "hidden" }
              : { position: "relative" }
          }
        >
          {!opsCollapsed && (
            <ResizeHandle
              side="left"
              onStart={(x) => beginResize("ops", x)}
              label="Resize Operation Center"
            />
          )}
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

/**
 * A seam grip: a thin invisible strip along the panel edge that reveals an
 * accent line on hover and drives resize on drag. Sits at the very edge (over
 * the grid's hairline gap), so grabbing the seam feels like grabbing the border
 * itself.
 */
const ResizeHandle: React.FC<{
  side: "left" | "right";
  onStart: (clientX: number) => void;
  label: string;
}> = ({ side, onStart, label }) => (
  <div
    role="separator"
    aria-orientation="vertical"
    aria-label={label}
    title={label}
    className="luca-workspace-resizer"
    onPointerDown={(event) => {
      event.preventDefault();
      onStart(event.clientX);
    }}
    style={{
      position: "absolute",
      top: 0,
      bottom: 0,
      [side]: 0,
      width: 8,
      cursor: "col-resize",
      zIndex: 45,
      touchAction: "none",
    }}
  />
);

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
