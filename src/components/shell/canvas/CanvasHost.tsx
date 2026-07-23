import React, { Suspense } from "react";
import { canvasService, type CanvasItem } from "../../../services/canvas/canvasService";
import { getCanvasRenderer } from "./canvasRenderers";
import { useCanvas } from "./useCanvas";
import { workspaceColor, workspaceType } from "../workspaceShellTokens";

/**
 * CanvasHost — the workspace canvas: the panel beside the thread where Luca's
 * artifacts live.
 *
 * Deliberately dumb. It owns the tab strip and the frame; each kind's renderer
 * owns its body and its toolbar (the Edit/View/Insert/Format/Share menu is the
 * DOCUMENT's, Monaco's palette is the CODE's). The host never knows what a kind
 * is — that is what lets "chart" and "html" arrive as registry entries rather
 * than edits here.
 *
 * When nothing is open the panel is absent from the shell entirely (App only
 * mounts the canvas column when items exist), so this empty state shows only in
 * the fleeting gap between the last close and the column unmounting.
 */

export const CanvasHost: React.FC = () => {
  const { items, active } = useCanvas();

  if (!active) {
    return (
      <div
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          color: workspaceColor.ink3,
          fontSize: workspaceType.meta,
        }}
      >
        Nothing on the canvas yet.
      </div>
    );
  }

  const renderer = getCanvasRenderer(active.kind);
  const Toolbar = renderer.toolbar;
  const Body = renderer.body;

  return (
    <>
      <CanvasTabStrip items={items} activeId={active.id} />
      {Toolbar ? <Toolbar item={active} /> : null}
      <Suspense
        fallback={
          <div style={{ flex: 1, display: "grid", placeItems: "center", color: workspaceColor.ink3, fontSize: 12 }}>
            Loading…
          </div>
        }
      >
        {/* key on id: switching items must remount, never bleed one artifact's
            editor state into another. */}
        <Body key={active.id} item={active} />
      </Suspense>
    </>
  );
};

const CanvasTabStrip: React.FC<{ items: CanvasItem[]; activeId: string }> = ({
  items,
  activeId,
}) => (
  <div
    role="tablist"
    aria-label="Canvas items"
    style={{
      flex: "none",
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "9px 12px",
      borderBottom: `1px solid ${workspaceColor.hairline}`,
      overflowX: "auto",
    }}
  >
    {items.map((item) => {
      const active = item.id === activeId;
      return (
        <span
          key={item.id}
          role="tab"
          aria-selected={active}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            flex: "none",
            padding: "5px 10px",
            borderRadius: 7,
            fontSize: workspaceType.meta,
            color: active ? workspaceColor.ink : workspaceColor.ink3,
            background: active ? workspaceColor.hover : "transparent",
            border: `1px solid ${active ? workspaceColor.hairline : "transparent"}`,
          }}
        >
          <button
            type="button"
            onClick={() => canvasService.setActive(item.id)}
            className="luca-workspace-toggle"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              border: 0,
              background: "transparent",
              color: "inherit",
              font: "inherit",
              cursor: "pointer",
              padding: 0,
              maxWidth: 200,
            }}
          >
            <span aria-hidden="true" style={{ opacity: 0.7 }}>
              {item.kind === "code" ? "⌗" : "▤"}
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.title}
            </span>
            {item.version > 1 && (
              <span style={{ color: workspaceColor.ink3, fontVariantNumeric: "tabular-nums" }}>
                v{item.version}
              </span>
            )}
          </button>
          <button
            type="button"
            aria-label={`Close ${item.title}`}
            onClick={() => canvasService.close(item.id)}
            className="luca-workspace-toggle"
            style={{
              border: 0,
              background: "transparent",
              color: workspaceColor.ink3,
              cursor: "pointer",
              padding: "0 1px",
              font: "inherit",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </span>
      );
    })}
  </div>
);

export default CanvasHost;
