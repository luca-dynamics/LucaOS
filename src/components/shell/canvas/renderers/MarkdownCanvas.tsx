import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CanvasRendererProps } from "../canvasRenderers";
import { workspaceColor } from "../../workspaceShellTokens";

/**
 * MarkdownCanvas — the document renderer.
 *
 * Read view first, which is the order artifacts actually ship in: the agent
 * writes markdown, the person reads it. Reader-side rich editing comes later
 * and slots in behind the same onEdit prop the registry already threads.
 *
 * Uses the repo's existing react-markdown + remark-gfm, styled through the
 * workspace tokens so a document reads as the same material as its frame.
 */

const MarkdownCanvas: React.FC<CanvasRendererProps> = ({ item }) => (
  <div
    data-luca-canvas-kind="markdown"
    className="luca-workspace-scroll luca-canvas-markdown"
    style={{ flex: 1, padding: "22px 24px 132px", color: workspaceColor.ink2 }}
  >
    <style>{`
      .luca-canvas-markdown h1 { font-size: 22px; letter-spacing: -0.02em; color: ${workspaceColor.ink}; margin: 0 0 4px; text-wrap: balance; }
      .luca-canvas-markdown h2 { font-size: 15px; color: ${workspaceColor.ink}; margin: 20px 0 7px; }
      .luca-canvas-markdown h3 { font-size: 13.5px; color: ${workspaceColor.ink}; margin: 16px 0 6px; }
      .luca-canvas-markdown p, .luca-canvas-markdown li { font-size: 13px; line-height: 1.62; }
      .luca-canvas-markdown ul, .luca-canvas-markdown ol { padding-left: 19px; }
      .luca-canvas-markdown a { color: ${workspaceColor.accent}; text-decoration: none; }
      .luca-canvas-markdown code { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 12px; background: ${workspaceColor.hover}; padding: 1px 5px; border-radius: 4px; }
      .luca-canvas-markdown pre { background: ${workspaceColor.hover}; border: 1px solid ${workspaceColor.hairline}; border-radius: 9px; padding: 12px 14px; overflow-x: auto; }
      .luca-canvas-markdown pre code { background: transparent; padding: 0; }
      .luca-canvas-markdown table { border-collapse: collapse; font-size: 12.5px; }
      .luca-canvas-markdown th, .luca-canvas-markdown td { border: 1px solid ${workspaceColor.hairline}; padding: 6px 10px; text-align: left; }
      .luca-canvas-markdown blockquote { margin: 8px 0; padding-left: 12px; border-left: 2px solid ${workspaceColor.hairline}; color: ${workspaceColor.ink3}; }
    `}</style>
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
  </div>
);

export default MarkdownCanvas;
