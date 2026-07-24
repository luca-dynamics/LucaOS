import React, { useState } from "react";
import { NavRow, SectionLabel, CollapseToggle } from "./WorkspacePrimitives";
import AppMenu from "../layout/AppMenu";
import { workspaceColor, workspaceRadius, workspaceType } from "./workspaceShellTokens";

/**
 * WorkspaceSidebar — where you are, and everything Luca can reach from here.
 *
 * Structure follows the target design: a Spaces header, then grouped tool
 * sections (Intelligence / Connections / Tools), and finally an ADVANCED group
 * that folds shut by default — the operator-tier surfaces (offensive security,
 * markets, sovereignty, system control) live behind one disclosure so the
 * everyday sidebar stays quiet and the power is one click away, not fifteen
 * tabs deep.
 *
 * Within a section the tools are laid out as a GRID of tiles, not a vertical
 * list — a category of eight surfaces reads as a compact pad rather than a long
 * scroll, and the one-word rule keeps every tile legible. Hover carries the
 * sentence; the panel behind the tile carries the rest. Groups are DATA —
 * App.tsx owns which surface maps to which handler and passes them in, so this
 * component never hard-codes a feature that might not be wired.
 *
 * In rail mode (collapsed) the grid folds back to single-column marks so the
 * icons stay reachable without labels.
 *
 * The brand row is the window-drag region on frameless Windows; index.css
 * already exempts buttons inside a drag region, so the toggles stay clickable.
 */

const GRID_COLUMNS = 2;

export interface WorkspaceToolLink {
  id: string;
  /** One word wherever possible. The tooltip may be a sentence; the tile may not. */
  label: string;
  glyph: string;
  hint?: string;
  /** Optional trailing count (e.g. pending items on that surface). */
  count?: number;
  onOpen: () => void;
}

export interface WorkspaceNavGroup {
  id: string;
  label: string;
  /**
   * Operator/pro-tier group: rendered behind a disclosure, folded shut by
   * default. Keeps the heavy surfaces out of the everyday eyeline.
   */
  advanced?: boolean;
  items: WorkspaceToolLink[];
}

export interface WorkspaceSidebarProps {
  /** Supplied by WorkspaceShell. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Toggle the Operation Center — wired by WorkspaceShell for the App menu. */
  onToggleOps?: () => void;
  /** The active context's name — today, the session; later, the Space. */
  contextLabel?: string;
  /** Count of today's threads/tasks, surfaced on the Spaces row. */
  todayCount?: number;
  onNewTask?: () => void;
  /** New session (App menu → File → New session). */
  onNewSession?: () => void;
  /** Grouped navigation. Preferred over `tools`. */
  groups?: WorkspaceNavGroup[];
  /** Back-compat flat list — wrapped into a single "Tools" group when no groups are given. */
  tools?: WorkspaceToolLink[];
  onOpenSettings?: () => void;
}

/**
 * One tool, keeping the normal row form — glyph beside a one-word label — but
 * sized to sit two-up in the grid. Not a big square tile; the same horizontal
 * structure as a NavRow, just packed to halve the vertical run.
 */
const ToolTile: React.FC<{ tool: WorkspaceToolLink }> = ({ tool }) => (
  <button
    type="button"
    onClick={tool.onOpen}
    title={tool.hint ?? tool.label}
    className="luca-workspace-nav"
    style={{
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: 8,
      minWidth: 0,
      padding: "6px 8px",
      border: 0,
      borderRadius: workspaceRadius.row,
      background: "transparent",
      font: "inherit",
      fontSize: workspaceType.meta,
      cursor: "pointer",
      color: workspaceColor.ink2,
      textAlign: "left",
    }}
  >
    <span
      aria-hidden="true"
      style={{ flex: "none", width: 15, display: "grid", placeItems: "center", color: workspaceColor.ink3 }}
    >
      {tool.glyph}
    </span>
    <span
      style={{
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {tool.label}
    </span>
    {typeof tool.count === "number" && tool.count > 0 ? (
      <span
        aria-hidden="true"
        style={{
          flex: "none",
          marginLeft: "auto",
          width: 6,
          height: 6,
          borderRadius: 999,
          background: workspaceColor.warn,
        }}
      />
    ) : null}
  </button>
);

/** The tile grid for one group; folds to single-column marks in rail mode. */
const ToolGrid: React.FC<{ items: WorkspaceToolLink[]; collapsed: boolean }> = ({
  items,
  collapsed,
}) => {
  if (collapsed) {
    return (
      <>
        {items.map((tool) => (
          <NavRow
            key={tool.id}
            icon={<span aria-hidden="true">{tool.glyph}</span>}
            collapsed
            count={tool.count}
            onClick={tool.onOpen}
            title={tool.hint ?? tool.label}
          >
            {tool.label}
          </NavRow>
        ))}
      </>
    );
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
        gap: 6,
        padding: "2px 10px 6px",
      }}
    >
      {items.map((tool) => (
        <ToolTile key={tool.id} tool={tool} />
      ))}
    </div>
  );
};

/** A collapsible operator-tier group. Folds shut by default. */
const AdvancedGroup: React.FC<{ group: WorkspaceNavGroup; collapsed: boolean }> = ({
  group,
  collapsed,
}) => {
  const [open, setOpen] = useState(false);

  // In rail mode there is no room for a disclosure; show the marks directly.
  if (collapsed) {
    return (
      <>
        <div style={{ height: 8 }} aria-hidden="true" />
        <ToolGrid items={group.items} collapsed />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="luca-workspace-nav"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          width: "calc(100% - 16px)",
          margin: "8px 8px 2px",
          padding: "4px 8px",
          border: 0,
          background: "transparent",
          font: "inherit",
          fontSize: workspaceType.label,
          fontWeight: 600,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          color: workspaceColor.ink3,
          cursor: "pointer",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            transition: "transform 160ms ease",
            transform: open ? "rotate(90deg)" : "none",
            fontSize: 9,
          }}
        >
          ▶
        </span>
        <span style={{ flex: 1, textAlign: "left" }}>{group.label}</span>
        <span style={{ fontSize: 9, letterSpacing: 0, opacity: 0.7 }}>PRO</span>
      </button>
      {open && <ToolGrid items={group.items} collapsed={false} />}
    </>
  );
};

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  collapsed = false,
  onToggleCollapsed,
  onToggleOps,
  contextLabel = "Personal",
  todayCount,
  onNewTask,
  onNewSession,
  groups,
  tools = [],
  onOpenSettings,
}) => {
  const resolvedGroups: WorkspaceNavGroup[] =
    groups && groups.length > 0
      ? groups
      : tools.length > 0
        ? [{ id: "tools", label: "Tools", items: tools }]
        : [];

  return (
    <>
      {/* Brand row — also the drag region for the frameless window. */}
      <div
        className="luca-window-drag"
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 9,
          padding: collapsed ? "15px 0 12px" : "15px 15px 12px",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: workspaceColor.ink,
        }}
      >
        {/* The Luca icon — the app's own mark. Both theme variants are rendered;
            CSS (WorkspacePrimitives) shows only the one matching the active theme
            (html.light-mode), so the mark follows the Settings light/dark/system
            choice live. Dark mode → /icon.png, light mode → /icon_dark.png. The
            imgs set NO inline display, so the stylesheet can hide one. */}
        <span style={{ flex: "none", display: "inline-block", width: 20, height: 20 }}>
          <img
            className="luca-brand-icon luca-brand-icon-dark"
            src="/icon.png"
            alt="Luca"
            width={20}
            height={20}
            style={{ width: 20, height: 20, borderRadius: 5, objectFit: "contain" }}
          />
          <img
            className="luca-brand-icon luca-brand-icon-light"
            src="/icon_dark.png"
            alt=""
            aria-hidden="true"
            width={20}
            height={20}
            style={{ width: 20, height: 20, borderRadius: 5, objectFit: "contain" }}
          />
        </span>
        {!collapsed && <span style={{ flex: 1, minWidth: 0 }}>LucaOS</span>}
        {!collapsed && onNewSession && (
          /* The File · Edit · View · Window menu — the old native menu bar,
             beside the sidebar's own collapse control. */
          <AppMenu
            onNewSession={onNewSession}
            onOpenSettings={onOpenSettings ?? (() => {})}
            onToggleLeftPanel={onToggleCollapsed ?? (() => {})}
            onToggleRightPanel={onToggleOps ?? (() => {})}
          />
        )}
        {onToggleCollapsed && !collapsed && (
          <CollapseToggle
            collapsed={collapsed}
            onToggle={onToggleCollapsed}
            side="left"
            label="Collapse sidebar"
          />
        )}
      </div>

      {/* Rail mode keeps the toggle reachable below the orb. */}
      {onToggleCollapsed && collapsed && (
        <div style={{ display: "grid", placeItems: "center", paddingBottom: 6 }}>
          <CollapseToggle
            collapsed={collapsed}
            onToggle={onToggleCollapsed}
            side="left"
            label="Expand sidebar"
          />
        </div>
      )}

      {onNewTask && (
        <NavRow
          icon={<span aria-hidden="true">＋</span>}
          collapsed={collapsed}
          onClick={onNewTask}
          title="Start a new task"
        >
          New
        </NavRow>
      )}

      <div className="luca-workspace-scroll" style={{ flex: 1 }}>
        {!collapsed && <SectionLabel>Spaces</SectionLabel>}
        <NavRow
          icon={<span aria-hidden="true">●</span>}
          active
          collapsed={collapsed}
          count={todayCount}
          title="Your current context"
        >
          {contextLabel}
        </NavRow>

        {resolvedGroups.map((group) =>
          group.advanced ? (
            <AdvancedGroup key={group.id} group={group} collapsed={collapsed} />
          ) : (
            <React.Fragment key={group.id}>
              {!collapsed && group.items.length > 0 && (
                <SectionLabel>{group.label}</SectionLabel>
              )}
              {collapsed && group.items.length > 0 && (
                <div style={{ height: 10 }} aria-hidden="true" />
              )}
              <ToolGrid items={group.items} collapsed={collapsed} />
            </React.Fragment>
          ),
        )}
      </div>

      {onOpenSettings && (
        <div
          style={{
            flex: "none",
            borderTop: `1px solid ${workspaceColor.hairline}`,
            padding: "6px 0",
          }}
        >
          <NavRow
            icon={<span aria-hidden="true">⚙</span>}
            collapsed={collapsed}
            onClick={onOpenSettings}
            title="Settings"
          >
            Settings
          </NavRow>
        </div>
      )}

      {/* Rail affordance note for screen readers, not a visual label. */}
      <span
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          fontSize: workspaceType.meta,
        }}
      >
        Sidebar {collapsed ? "collapsed to rail" : "expanded"}
      </span>
    </>
  );
};

export default WorkspaceSidebar;
