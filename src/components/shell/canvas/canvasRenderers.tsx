import React, { lazy } from "react";
import type { CanvasItem, CanvasItemKind } from "../../../services/canvas/canvasService";
import { workspaceColor, workspaceType } from "../workspaceShellTokens";

/**
 * canvasRenderers — the registry that makes the canvas a HOST, not a document
 * viewer.
 *
 * A renderer maps one kind to how it draws and what chrome it carries. The
 * host (CanvasHost) stays dumb: it lays out the frame and delegates. That
 * split is the whole point — adding "chart" or "html" later is a new registry
 * entry, never a change to the host, exactly how Claude's artifact panel takes
 * new kinds without rewriting the panel.
 *
 * Both heavy renderers are lazy: Monaco and react-markdown are large, and an
 * empty canvas (the common case) must cost nothing. Suspense fallbacks live in
 * CanvasHost.
 */

export interface CanvasRendererProps {
  item: CanvasItem;
  /** Reader edits (per kind) flow back through here; omitted = read-only. */
  onEdit?: (content: string) => void;
}

export interface CanvasRenderer {
  /** The kind's own toolbar. The markdown menu is the DOCUMENT's, not the host's. */
  toolbar?: React.ComponentType<{ item: CanvasItem }>;
  body: React.ComponentType<CanvasRendererProps>;
}

const MarkdownBody = lazy(() => import("./renderers/MarkdownCanvas"));
const CodeBody = lazy(() => import("./renderers/CodeCanvas"));

const MarkdownToolbar: React.FC<{ item: CanvasItem }> = () => (
  <div
    role="toolbar"
    aria-label="Document"
    style={{
      display: "flex",
      gap: 15,
      padding: "8px 15px",
      borderBottom: `1px solid ${workspaceColor.hairline}`,
      fontSize: workspaceType.meta,
      color: workspaceColor.ink3,
    }}
  >
    {["Edit", "View", "Insert", "Format", "Share"].map((label) => (
      <span key={label} style={{ cursor: "default" }}>
        {label}
      </span>
    ))}
  </div>
);

const CodeToolbar: React.FC<{ item: CanvasItem }> = ({ item }) => (
  <div
    role="toolbar"
    aria-label="Code"
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "8px 15px",
      borderBottom: `1px solid ${workspaceColor.hairline}`,
      fontSize: workspaceType.meta,
      color: workspaceColor.ink3,
    }}
  >
    <span style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {item.language ?? "text"}
    </span>
  </div>
);

const RENDERERS: Record<CanvasItemKind, CanvasRenderer> = {
  markdown: { toolbar: MarkdownToolbar, body: MarkdownBody },
  code: { toolbar: CodeToolbar, body: CodeBody },
};

export const getCanvasRenderer = (kind: CanvasItemKind): CanvasRenderer =>
  RENDERERS[kind] ?? RENDERERS.markdown;

/** Kinds the host advertises — drives any "new item" affordance. */
export const CANVAS_KINDS = Object.keys(RENDERERS) as CanvasItemKind[];
