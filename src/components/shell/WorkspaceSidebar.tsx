import React from "react";
import { NavRow, SectionLabel, CollapseToggle } from "./WorkspacePrimitives";
import AppMenu from "../layout/AppMenu";
import {
  buildThreadRailRows,
  type ThreadRailRow,
  type ThreadRailThread,
} from "../left-panel/sessionsRailModel";
import { selectSidebarToolRows, type WorkspaceNavGroup } from "./workspaceNavGroups";
import { workspaceColor, workspaceRadius, workspaceType } from "./workspaceShellTokens";

/**
 * WorkspaceSidebar — what you were doing, and the few things you reach for.
 *
 * This was a capability pad: 21 tools in a two-up grid across four sections,
 * thirteen behind a PRO disclosure, and a `● Personal` row that was styled as the
 * active navigation item and had no click handler at all. Twelve rows at rest
 * against a budget of six.
 *
 * It is now HISTORY FIRST, which is the one structural thing a desktop AI rail
 * has to be. Conversations are the content — today / earlier, quiet rows, dim
 * times — and beneath them sit only the tools that are pinned or actually
 * running. The other seventeen moved to `WorkspaceToolsSurface` behind
 * `All tools…`: relocated, not deleted, which is the direction's own guardrail.
 *
 * Six primary items at rest: New chat · three tool rows · All tools… · Settings.
 * Thread rows are content and cap themselves at SESSIONS_RAIL_MAX_ROWS.
 *
 * Section labels are lowercase whispers rather than tracked-out capitals. A rail
 * that shouts SPACES / INTELLIGENCE / TOOLS at you is reading itself aloud; the
 * label is scaffolding for the content, so it should sit under it.
 *
 * Groups remain DATA — `App.tsx` owns which surface maps to which handler (see
 * workspaceNavGroups) so this component never hard-codes a feature that might
 * not be wired.
 *
 * The brand row is the window-drag region on frameless Windows; index.css
 * already exempts buttons inside a drag region, so the toggles stay clickable.
 */

export type { WorkspaceNavGroup, WorkspaceToolLink } from "./workspaceNavGroups";

export interface WorkspaceSidebarProps {
  /** Supplied by WorkspaceShell. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Toggle the Operation Center — wired by WorkspaceShell for the App menu. */
  onToggleOps?: () => void;

  // ── Conversations ─────────────────────────────────────────────────────────
  /** The archive, newest-first order not required — the model sorts. */
  threads?: readonly ThreadRailThread[];
  activeThreadId?: string;
  onSelectThread?: (id: string) => void;
  /** Deleting one thread. Confirmed here, at the affordance. */
  onDeleteThread?: (id: string) => void;
  /** Start a fresh thread. Destroys nothing — see conversationThreadService. */
  onNewSession?: () => void;
  /** Put the caret in the composer, so "New chat" lands ready to type. */
  onNewTask?: () => void;

  // ── Tools ─────────────────────────────────────────────────────────────────
  /** Every surface, grouped. The rail renders only running-or-pinned. */
  groups?: WorkspaceNavGroup[];
  /** Opens WorkspaceToolsSurface with the full set. */
  onOpenAllTools?: () => void;
  /** So Escape can return focus to the link that opened the tools surface. */
  allToolsRef?: React.RefObject<HTMLButtonElement>;

  onOpenSettings?: () => void;
}

/**
 * One conversation. Not a NavRow, because the row carries a second control (the
 * forget ⨯) and a button cannot contain a button — so this composes the same
 * visual grammar around a flex container instead.
 */
const ThreadRow: React.FC<{
  row: ThreadRailRow;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}> = ({ row, onSelect, onDelete }) => (
  <div
    className="luca-thread-row"
    style={{
      display: "flex",
      alignItems: "center",
      width: "calc(100% - 16px)",
      margin: "1px 8px",
      borderRadius: workspaceRadius.row,
      background: row.active ? workspaceColor.accentSoft : "transparent",
    }}
  >
    <button
      type="button"
      onClick={onSelect ? () => onSelect(row.id) : undefined}
      aria-current={row.active ? "true" : undefined}
      title={row.title}
      className="luca-workspace-nav"
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "6px 8px",
        border: 0,
        borderRadius: workspaceRadius.row,
        background: "transparent",
        font: "inherit",
        fontSize: workspaceType.body,
        fontWeight: row.active ? 500 : 400,
        textAlign: "left",
        color: row.active ? workspaceColor.ink : workspaceColor.ink2,
        cursor: "pointer",
      }}
    >
      {/* Filled for the thread you are in, hollow for the rest. The dot says
          "here", not "alarm" — tone is the right panel's job. */}
      <span
        aria-hidden="true"
        style={{
          flex: "none",
          width: 15,
          display: "grid",
          placeItems: "center",
          fontSize: 9,
          color: row.active ? workspaceColor.accent : workspaceColor.ink3,
        }}
      >
        {row.active ? "●" : "○"}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {row.title}
      </span>
      <span
        style={{
          flex: "none",
          fontSize: workspaceType.meta,
          color: workspaceColor.ink3,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {row.when}
      </span>
    </button>
    {onDelete && (
      <button
        type="button"
        // Confirmed at the affordance rather than upstream: this deletes a
        // conversation and there is no undo for it, so it fails closed here
        // where the title is in hand and can be named back to the user.
        onClick={() => {
          if (window.confirm(`Delete “${row.title}”? This cannot be undone.`)) {
            onDelete(row.id);
          }
        }}
        aria-label={`Delete ${row.title}`}
        title="Delete this conversation"
        className="luca-thread-forget luca-workspace-toggle"
        style={{
          flex: "none",
          width: 22,
          height: 22,
          marginRight: 4,
          display: "grid",
          placeItems: "center",
          border: 0,
          borderRadius: 6,
          background: "transparent",
          font: "inherit",
          fontSize: 12,
          lineHeight: 1,
          color: workspaceColor.ink3,
          cursor: "pointer",
        }}
      >
        ⨯
      </button>
    )}
  </div>
);

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  collapsed = false,
  onToggleCollapsed,
  onToggleOps,
  threads = [],
  activeThreadId,
  onSelectThread,
  onDeleteThread,
  onNewSession,
  onNewTask,
  groups = [],
  onOpenAllTools,
  allToolsRef,
  onOpenSettings,
}) => {
  const rows = buildThreadRailRows(threads, activeThreadId);
  const today = rows.filter((row) => row.bucket === "today");
  const earlier = rows.filter((row) => row.bucket === "earlier");
  const toolRows = selectSidebarToolRows(groups);

  /** New chat, then the caret — one row does both, because that is one intent. */
  const startNewChat = onNewSession
    ? () => {
        onNewSession();
        onNewTask?.();
      }
    : undefined;

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
        {!collapsed && startNewChat && (
          /* The File · Edit · View · Window menu — the old native menu bar,
             beside the sidebar's own collapse control. */
          <AppMenu
            onNewSession={startNewChat}
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

      {startNewChat && (
        <NavRow
          icon={<span aria-hidden="true">＋</span>}
          collapsed={collapsed}
          onClick={startNewChat}
          title="Start a new conversation"
        >
          New chat
        </NavRow>
      )}

      <div className="luca-workspace-scroll" style={{ flex: 1 }}>
        {/* Conversations. In rail mode only the active one survives, as a single
            mark — you must still be able to see where you are at 58px. */}
        {collapsed ? (
          rows
            .filter((row) => row.active)
            .map((row) => (
              <NavRow
                key={row.id}
                icon={<span aria-hidden="true">●</span>}
                active
                collapsed
                title={row.title}
              >
                {row.title}
              </NavRow>
            ))
        ) : (
          <>
            {today.length > 0 && <SectionLabel>today</SectionLabel>}
            {today.map((row) => (
              <ThreadRow
                key={row.id}
                row={row}
                onSelect={onSelectThread}
                onDelete={onDeleteThread}
              />
            ))}
            {earlier.length > 0 && <SectionLabel>earlier</SectionLabel>}
            {earlier.map((row) => (
              <ThreadRow
                key={row.id}
                row={row}
                onSelect={onSelectThread}
                onDelete={onDeleteThread}
              />
            ))}
          </>
        )}

        {/* Tools: running first, then pinned, capped. A tone dot appears only
            when something is genuinely open — an always-on dot is decoration,
            and decoration that looks like status is worse than none. */}
        {toolRows.length > 0 && (
          <>
            {!collapsed && <SectionLabel>tools</SectionLabel>}
            {collapsed && <div style={{ height: 10 }} aria-hidden="true" />}
            {toolRows.map((tool) => (
              <NavRow
                key={tool.id}
                icon={<span aria-hidden="true">{tool.glyph}</span>}
                collapsed={collapsed}
                count={tool.count}
                onClick={tool.onOpen}
                title={tool.hint ?? tool.label}
              >
                <span
                  style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
                >
                  {tool.label}
                  {tool.running && (
                    <span
                      style={{
                        fontSize: workspaceType.meta,
                        color: workspaceColor.good,
                      }}
                    >
                      running
                    </span>
                  )}
                </span>
              </NavRow>
            ))}
          </>
        )}

        {/* A quiet "more", not a nav row — it opens a surface rather than
            navigating, and the seventeen relocated tools live behind it. */}
        {onOpenAllTools && !collapsed && (
          <button
            ref={allToolsRef}
            type="button"
            onClick={onOpenAllTools}
            className="luca-workspace-nav"
            style={{
              display: "block",
              width: "calc(100% - 16px)",
              margin: "2px 8px 8px",
              padding: "5px 8px 5px 32px",
              border: 0,
              borderRadius: workspaceRadius.row,
              background: "transparent",
              font: "inherit",
              fontSize: workspaceType.meta,
              textAlign: "left",
              color: workspaceColor.ink3,
              cursor: "pointer",
            }}
          >
            All tools…
          </button>
        )}
        {onOpenAllTools && collapsed && (
          <NavRow
            icon={<span aria-hidden="true">⋯</span>}
            collapsed
            onClick={onOpenAllTools}
            title="All tools"
          >
            All tools
          </NavRow>
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
