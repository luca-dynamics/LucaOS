import React from "react";
import {
  WORKSPACE_DURATION_MS,
  WORKSPACE_EASE,
  workspaceCardStyle,
  workspaceColor,
  workspacePanelHeaderStyle,
  workspaceRadius,
  workspaceSectionLabelStyle,
  workspaceType,
} from "./workspaceShellTokens";

/**
 * WorkspacePrimitives — the small set every shell panel is built from.
 *
 * These exist so "calm" is inherited rather than re-decided in each of the
 * ~315 components that will eventually sit inside this frame. A panel that
 * hand-rolls its own card chrome will drift; one that composes PanelCard
 * cannot. Every primitive is presentational and controlled — no state, no
 * effects, no data fetching.
 */

// ── Section label ───────────────────────────────────────────────────────────

export const SectionLabel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div style={{ ...workspaceSectionLabelStyle, ...style }}>{children}</div>
);

// ── Panel header ────────────────────────────────────────────────────────────

export const PanelHeader: React.FC<{
  title: React.ReactNode;
  /** Trailing control — usually a CollapseToggle. */
  action?: React.ReactNode;
}> = ({ title, action }) => (
  <div style={workspacePanelHeaderStyle}>
    <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {title}
    </span>
    {action ? <span style={{ marginLeft: "auto", display: "flex" }}>{action}</span> : null}
  </div>
);

// ── Card ────────────────────────────────────────────────────────────────────

export const PanelCard: React.FC<{
  label?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ label, children, style }) => (
  <section style={{ ...workspaceCardStyle, ...style }}>
    {label ? (
      /* Composes the section-label token rather than restating it: this h3 used
         to carry its own uppercase + 0.09em inline, so changing how the shell
         speaks meant finding every copy. Only the box metrics are local. */
      <h3 style={{ ...workspaceSectionLabelStyle, padding: 0, margin: "0 0 9px" }}>
        {label}
      </h3>
    ) : null}
    {children}
  </section>
);

// ── Count badge ─────────────────────────────────────────────────────────────

export const CountBadge: React.FC<{ value: number; emphasized?: boolean }> = ({
  value,
  emphasized = false,
}) => (
  <span
    style={{
      marginLeft: "auto",
      minWidth: 19,
      padding: "1px 7px",
      borderRadius: workspaceRadius.pill,
      textAlign: "center",
      fontSize: "10.5px",
      fontVariantNumeric: "tabular-nums",
      color: emphasized ? "#fff" : workspaceColor.ink2,
      background: emphasized ? workspaceColor.accent : workspaceColor.hover,
    }}
  >
    {value}
  </span>
);

// ── Nav row ─────────────────────────────────────────────────────────────────

export const NavRow: React.FC<{
  icon?: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
  count?: number;
  /** Rail mode: the label folds away, the mark stays. */
  collapsed?: boolean;
  onClick?: () => void;
  title?: string;
}> = ({ icon, children, active = false, count, collapsed = false, onClick, title }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={active ? "true" : undefined}
    title={title ?? (collapsed && typeof children === "string" ? children : undefined)}
    className="luca-workspace-nav"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "flex-start",
      gap: collapsed ? 0 : 9,
      width: "calc(100% - 16px)",
      margin: "1px 8px",
      padding: "6px 8px",
      border: 0,
      borderRadius: workspaceRadius.row,
      textAlign: "left",
      font: "inherit",
      fontSize: workspaceType.body,
      fontWeight: active ? 500 : 400,
      cursor: "pointer",
      color: active ? workspaceColor.ink : workspaceColor.ink2,
      background: active ? workspaceColor.accentSoft : "transparent",
      transition: `background ${WORKSPACE_DURATION_MS}ms ${WORKSPACE_EASE}, color 160ms ease`,
    }}
  >
    {icon ? (
      <span
        aria-hidden="true"
        style={{
          flex: "none",
          width: 15,
          display: "grid",
          placeItems: "center",
          color: active ? workspaceColor.accent : workspaceColor.ink3,
        }}
      >
        {icon}
      </span>
    ) : null}
    {!collapsed && (
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {children}
      </span>
    )}
    {!collapsed && typeof count === "number" ? (
      <CountBadge value={count} emphasized={active} />
    ) : null}
  </button>
);

// ── Collapse toggle ─────────────────────────────────────────────────────────

export const CollapseToggle: React.FC<{
  collapsed: boolean;
  onToggle: () => void;
  /** Which edge the panel lives on — decides which way the chevron points. */
  side: "left" | "right";
  label: string;
}> = ({ collapsed, onToggle, side, label }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={label}
      title={label}
      className="luca-workspace-toggle"
      style={{
        flex: "none",
        width: 24,
        height: 24,
        display: "grid",
        placeItems: "center",
        border: "1px solid transparent",
        borderRadius: 6,
        background: "transparent",
        color: workspaceColor.ink3,
        font: "inherit",
        lineHeight: 1,
        cursor: "pointer",
        transition: `background 160ms ease, color 160ms ease`,
      }}
    >
      <SidebarGlyph side={side} collapsed={collapsed} />
    </button>
  );
};

/**
 * The real toggle-panel mark: a rounded frame with the panel's own column
 * shaded on the side it lives — the standard "show/hide sidebar" icon, not a
 * bare chevron. The shaded strip empties when the panel is collapsed, so the
 * icon reads its own state.
 */
const SidebarGlyph: React.FC<{ side: "left" | "right"; collapsed: boolean }> = ({
  side,
  collapsed,
}) => {
  const stripX = side === "left" ? 3.5 : 14.5;
  const lineX = side === "left" ? 9.5 : 14.5;
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      {!collapsed && (
        <rect x={stripX} y="4.5" width="6" height="15" fill="currentColor" opacity="0.35" />
      )}
      <line x1={lineX} y1="4.5" x2={lineX} y2="19.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
};

// ── Shared interaction styles ───────────────────────────────────────────────

/**
 * Hover and focus for the primitives. Injected once by WorkspaceShell rather
 * than repeated inline, because :hover and :focus-visible cannot be expressed
 * in a style object — and a shell without visible keyboard focus is not
 * shippable.
 */
export const WORKSPACE_INTERACTION_CSS = `
.luca-workspace-nav:hover { background: ${workspaceColor.hover} !important; color: ${workspaceColor.ink} !important; }
.luca-workspace-nav:focus-visible,
.luca-workspace-toggle:focus-visible,
.luca-workspace-handle:focus-visible {
  outline: 2px solid ${workspaceColor.accent};
  outline-offset: 2px;
}
.luca-workspace-toggle:hover { background: ${workspaceColor.hover}; color: ${workspaceColor.ink}; }
.luca-workspace-handle:hover { color: ${workspaceColor.ink}; }
/* A conversation row is two controls in one strip — the row itself and a forget
   ⨯ — so the CONTAINER owns hover (the inner button's own nav hover is cancelled,
   or the two translucent layers would stack into a darker band). The ⨯ is hidden
   at rest and revealed by hover OR focus-within, so it never becomes a
   destructive control that only a mouse can find. */
.luca-thread-row:hover { background: ${workspaceColor.hover}; }
.luca-thread-row .luca-workspace-nav:hover { background: transparent !important; }
.luca-thread-forget { opacity: 0; transition: opacity 160ms ease; }
.luca-thread-row:hover .luca-thread-forget,
.luca-thread-row:focus-within .luca-thread-forget { opacity: 1; }
/* Seam grips: invisible until hovered/dragged, then a centred accent line
   marks the edge you're pulling. */
.luca-workspace-resizer { background: transparent; }
.luca-workspace-resizer::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
  background: transparent;
  transition: background 160ms ease;
}
.luca-workspace-resizer:hover::after,
.luca-workspace-resizer:active::after { background: ${workspaceColor.accent}; }
.luca-workspace-scroll { overflow-y: auto; overflow-x: hidden; }
.luca-workspace-scroll::-webkit-scrollbar { width: 8px; }
.luca-workspace-scroll::-webkit-scrollbar-thumb { background: ${workspaceColor.hairline}; border-radius: 99px; }
.luca-workspace-scroll::-webkit-scrollbar-track { background: transparent; }
/* Theme-aware Luca mark. html.light-mode follows the Settings light/dark/system
   choice (App applies it live), so the mark flips with the theme, no JS. CSS
   owns display here — the imgs must NOT set an inline display, or it would beat
   these rules and both would show. Dark mode shows /icon.png, light mode shows
   /icon_dark.png (see the classes' src in WorkspaceSidebar). */
.luca-brand-icon-dark { display: block; }
.luca-brand-icon-light { display: none; }
:root.light-mode .luca-brand-icon-dark { display: none; }
:root.light-mode .luca-brand-icon-light { display: block; }
@media (prefers-reduced-motion: reduce) {
  .luca-workspace-grid, .luca-workspace-toggle, .luca-workspace-nav, .luca-thread-forget { transition: none !important; }
}
/* The command bar's living outline: the accent hairline brightens and dims on a
   slow breath, so the box you speak into feels awake. The lift shadow is folded
   into every keyframe so the animation owns box-shadow outright (an inline one
   would outrank it and freeze the glow). */
.luca-command-glow { animation: luca-command-glow 3.6s ease-in-out infinite; }
@keyframes luca-command-glow {
  0%, 100% {
    box-shadow: 0 16px 44px rgba(0, 0, 0, 0.35),
                0 0 0 1px color-mix(in srgb, ${workspaceColor.accent} 8%, transparent);
  }
  50% {
    box-shadow: 0 16px 44px rgba(0, 0, 0, 0.35),
                0 0 0 1px color-mix(in srgb, ${workspaceColor.accent} 52%, transparent),
                0 0 20px color-mix(in srgb, ${workspaceColor.accent} 22%, transparent);
  }
}
@media (prefers-reduced-motion: reduce) { .luca-command-glow { animation: none; } }
`;
