import React from "react";
import { NavRow, SectionLabel, CollapseToggle } from "./WorkspacePrimitives";
import { workspaceColor, workspaceType } from "./workspaceShellTokens";

/**
 * WorkspaceSidebar — where you are.
 *
 * Deliberately terse. The legacy panels drowned in wording — multi-word
 * buttons, jargon rows, fifteen settings tabs — so this sidebar holds a hard
 * rule: ONE word per row. If a surface cannot say what it is in one word, the
 * row is not the place to explain it; hover carries the sentence, the panel
 * itself carries the rest.
 *
 * Sections follow the target design (Spaces / Tools), but only what is REAL
 * today renders: one space (this session's context) and the tools the shell
 * can actually open. Rows for services that do not exist yet would be
 * furniture — the sidebar grows a row when the thing behind it ships, not
 * before.
 *
 * The brand row is the window-drag region on frameless Windows; index.css
 * already exempts buttons inside a drag region, so the collapse toggle stays
 * clickable without any per-element opt-out.
 */

export interface WorkspaceToolLink {
  id: string;
  /** One word. The tooltip may be a sentence; the row may not. */
  label: string;
  glyph: string;
  hint?: string;
  onOpen: () => void;
}

export interface WorkspaceSidebarProps {
  /** Supplied by WorkspaceShell. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** The active context's name — today, the session; later, the Space. */
  contextLabel?: string;
  onNewTask?: () => void;
  tools?: WorkspaceToolLink[];
  onOpenSettings?: () => void;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  collapsed = false,
  onToggleCollapsed,
  contextLabel = "Personal",
  onNewTask,
  tools = [],
  onOpenSettings,
}) => (
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
      <span
        aria-hidden="true"
        style={{
          width: 16,
          height: 16,
          flex: "none",
          borderRadius: 999,
          background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${workspaceColor.accent} 45%, #ffffff), ${workspaceColor.accent} 62%, color-mix(in srgb, ${workspaceColor.accent} 70%, #000000))`,
          boxShadow: `0 0 12px ${workspaceColor.accentLine}`,
        }}
      />
      {!collapsed && <span style={{ flex: 1, minWidth: 0 }}>LucaOS</span>}
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
        title="Your current context"
      >
        {contextLabel}
      </NavRow>

      {tools.length > 0 && !collapsed && <SectionLabel>Tools</SectionLabel>}
      {collapsed && tools.length > 0 && (
        <div style={{ height: 10 }} aria-hidden="true" />
      )}
      {tools.map((tool) => (
        <NavRow
          key={tool.id}
          icon={<span aria-hidden="true">{tool.glyph}</span>}
          collapsed={collapsed}
          onClick={tool.onOpen}
          title={tool.hint ?? tool.label}
        >
          {tool.label}
        </NavRow>
      ))}
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

export default WorkspaceSidebar;
