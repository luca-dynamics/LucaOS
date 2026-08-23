import React, { useEffect, useMemo, useRef, useState } from "react";
import { shouldCollapseAdvancedLeftPanelGroups } from "../../experience/dashboardDisclosure";
import type { LucaExperienceMode } from "../../experience/experienceMode";
import { useLucaDismissableLayer } from "../ui/luca/lucaOverlayFoundation";
import type { WorkspaceNavGroup, WorkspaceToolLink } from "./workspaceNavGroups";
import {
  WORKSPACE_DURATION_MS,
  WORKSPACE_EASE,
  workspaceArrivalSurfaceStyle,
  workspaceColor,
  workspaceRadius,
  workspaceType,
} from "./workspaceShellTokens";

/**
 * WorkspaceToolsSurface — where the 21 capabilities went.
 *
 * The sidebar used to be a capability pad: 21 tools in a two-up grid across four
 * groups, thirteen of them behind a PRO disclosure. That is a lot of power and
 * none of it was lost here — it was RELOCATED, which is the guardrail the
 * interface direction states outright ("relocate, don't delete"). The rail keeps
 * what is pinned or actually running; everything else is one click away under
 * `All tools…`.
 *
 * It is a spatial panel, not a modal: confined to the centre column, the
 * conversation still visible behind it, dismissed by Escape or by clicking away.
 * The direction doc prefers that to a full-screen dialog, and no command palette
 * exists in this app to compete with it.
 *
 * It is also the only surface in the shell that is ROUNDED. That is the frame's
 * grammar, not decoration: square means structure that was always there, rounded
 * means something arrived. Hence `workspaceArrivalSurfaceStyle` rather than a
 * local radius — see its note in workspaceShellTokens.
 *
 * The operator tier is a DISCLOSURE here, not a filter — closed by default in
 * Basic (`shouldCollapseAdvancedLeftPanelGroups`), open in Pro and Creator. It is
 * deliberately never hidden: this surface is now the only place those thirteen
 * capabilities live, so omitting them for a mode would make them unreachable
 * rather than quiet, which is the one thing the guardrail forbids. A door, not a
 * wall — and note that `shouldShowAdvancedTools` is `true` in every mode, so
 * gating on it would have been a no-op wearing the costume of a permission check.
 */

export interface WorkspaceToolsSurfaceProps {
  open: boolean;
  onClose: () => void;
  groups: WorkspaceNavGroup[];
  experienceMode: LucaExperienceMode;
  /** The `All tools…` link, so focus returns to it on Escape. */
  triggerRef?: React.RefObject<HTMLElement>;
}

/** Case- and space-insensitive match across the label and its sentence. */
function matches(tool: WorkspaceToolLink, query: string): boolean {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return (
    tool.label.toLowerCase().includes(needle) ||
    (tool.hint ?? "").toLowerCase().includes(needle)
  );
}

const ToolRow: React.FC<{ tool: WorkspaceToolLink; onOpen: () => void }> = ({
  tool,
  onOpen,
}) => (
  <button
    type="button"
    onClick={onOpen}
    className="luca-workspace-nav"
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: "100%",
      padding: "8px 10px",
      border: 0,
      borderRadius: workspaceRadius.row,
      background: "transparent",
      font: "inherit",
      fontSize: workspaceType.body,
      textAlign: "left",
      color: workspaceColor.ink2,
      cursor: "pointer",
      transition: `background ${WORKSPACE_DURATION_MS}ms ${WORKSPACE_EASE}`,
    }}
  >
    <span
      aria-hidden="true"
      style={{
        flex: "none",
        width: 17,
        display: "grid",
        placeItems: "center",
        color: tool.running ? workspaceColor.good : workspaceColor.ink3,
      }}
    >
      {tool.glyph}
    </span>
    <span style={{ flex: "none", color: workspaceColor.ink }}>{tool.label}</span>
    {/* The sentence lives here rather than in a tooltip: this is the one place
        with room for it, and a surface you are choosing between twenty-one of
        should not require hovering to be understood. */}
    <span
      style={{
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontSize: workspaceType.meta,
        color: workspaceColor.ink3,
      }}
    >
      {tool.hint}
    </span>
    {tool.running ? (
      <span
        style={{
          flex: "none",
          marginLeft: "auto",
          fontSize: workspaceType.meta,
          color: workspaceColor.good,
        }}
      >
        open
      </span>
    ) : null}
  </button>
);

/** A group's heading. The operator tier gets a caret and a count; the rest do not. */
const GroupHeading: React.FC<{
  label: string;
  count: number;
  disclosure?: { open: boolean; onToggle: () => void };
}> = ({ label, count, disclosure }) => {
  const text: React.CSSProperties = {
    margin: "10px 10px 4px",
    fontSize: workspaceType.label,
    fontWeight: 600,
    color: workspaceColor.ink3,
  };

  if (!disclosure) return <h3 style={text}>{label}</h3>;

  return (
    <h3 style={{ ...text, margin: 0 }}>
      <button
        type="button"
        onClick={disclosure.onToggle}
        aria-expanded={disclosure.open}
        // Deliberately NOT `luca-workspace-nav`: a heading that folds is chrome,
        // not one of the twenty-one destinations, and counting it as a row would
        // make "how many tools are listed" answer wrong.
        className="luca-workspace-toggle"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          width: "100%",
          margin: "10px 0 4px",
          padding: "4px 10px",
          border: 0,
          borderRadius: workspaceRadius.row,
          background: "transparent",
          font: "inherit",
          color: "inherit",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            fontSize: 9,
            transition: `transform ${WORKSPACE_DURATION_MS}ms ${WORKSPACE_EASE}`,
            transform: disclosure.open ? "rotate(90deg)" : "none",
          }}
        >
          ▶
        </span>
        <span style={{ flex: 1 }}>{label}</span>
        {/* The count is what keeps a closed group from reading as an empty one. */}
        <span style={{ fontWeight: 400 }}>{count}</span>
      </button>
    </h3>
  );
};

export const WorkspaceToolsSurface: React.FC<WorkspaceToolsSurfaceProps> = ({
  open,
  onClose,
  groups,
  experienceMode,
  triggerRef,
}) => {
  const [query, setQuery] = useState("");
  /** `null` = follow the experience mode; a boolean = the user said otherwise. */
  const [advancedOverride, setAdvancedOverride] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);

  useLucaDismissableLayer({
    open,
    containerRef,
    triggerRef,
    onRequestClose: onClose,
  });

  // Opening lands the caret in the filter, and closing forgets the query — a
  // surface that reopens still filtered looks broken.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setAdvancedOverride(null);
      return;
    }
    fieldRef.current?.focus({ preventScroll: true });
  }, [open]);

  const searching = query.trim().length > 0;
  /**
   * A search always reaches everything. Leaving the tier closed while its rows
   * matched would report "nothing here" about surfaces that are right there.
   */
  const advancedOpen =
    searching ||
    (advancedOverride ?? !shouldCollapseAdvancedLeftPanelGroups(experienceMode));

  const visible = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((tool) => matches(tool, query)),
        }))
        .filter((group) => group.items.length > 0),
    [groups, query],
  );

  if (!open) return null;

  const total = visible.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="All tools"
      style={{
        ...workspaceArrivalSurfaceStyle,
        position: "absolute",
        // Inset from the column rather than filling it: the conversation stays
        // visible around the edges, so this reads as something laid on top of
        // your work instead of a screen you navigated to.
        left: 18,
        right: 18,
        top: 18,
        maxHeight: "calc(100% - 36px)",
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: "none",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          borderBottom: `1px solid ${workspaceColor.hairline}`,
        }}
      >
        <input
          ref={fieldRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter tools"
          aria-label="Filter tools"
          style={{
            flex: 1,
            minWidth: 0,
            padding: "6px 9px",
            border: `1px solid ${workspaceColor.hairline}`,
            borderRadius: workspaceRadius.row,
            background: "transparent",
            font: "inherit",
            fontSize: workspaceType.body,
            color: workspaceColor.ink,
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close all tools"
          className="luca-workspace-toggle"
          style={{
            flex: "none",
            width: 24,
            height: 24,
            display: "grid",
            placeItems: "center",
            border: 0,
            borderRadius: 6,
            background: "transparent",
            font: "inherit",
            color: workspaceColor.ink3,
            cursor: "pointer",
          }}
        >
          ⨯
        </button>
      </div>

      <div className="luca-workspace-scroll" style={{ flex: 1, padding: "6px 8px 10px" }}>
        {total === 0 ? (
          <p
            style={{
              margin: "14px 8px",
              fontSize: workspaceType.body,
              color: workspaceColor.ink3,
            }}
          >
            Nothing matches “{query.trim()}”.
          </p>
        ) : (
          visible.map((group) => {
            const folded = Boolean(group.advanced) && !advancedOpen;
            return (
              <section key={group.id} style={{ marginBottom: 4 }}>
                <GroupHeading
                  label={group.label}
                  count={group.items.length}
                  disclosure={
                    group.advanced
                      ? {
                          open: advancedOpen,
                          onToggle: () => setAdvancedOverride(!advancedOpen),
                        }
                      : undefined
                  }
                />
                {folded
                  ? null
                  : group.items.map((tool) => (
                      <ToolRow
                        key={tool.id}
                        tool={tool}
                        onOpen={() => {
                          // Close first: the surface has done its job, and leaving
                          // it over the modal it just opened would bury it.
                          onClose();
                          tool.onOpen();
                        }}
                      />
                    ))}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WorkspaceToolsSurface;
