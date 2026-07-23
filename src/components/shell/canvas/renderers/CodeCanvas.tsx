import React from "react";
import Editor from "@monaco-editor/react";
import type { CanvasRendererProps } from "../canvasRenderers";
import { workspaceColor } from "../../workspaceShellTokens";

/**
 * CodeCanvas — the code renderer.
 *
 * Same Monaco the repo already ships in CodeEditor.tsx, so the canvas gains a
 * real code surface — syntax, selection, minimap-off calm — without a new
 * dependency. read-only until onEdit is supplied, matching the markdown
 * renderer: the agent writes first, the person edits second.
 *
 * Monaco carries its own scroll and toolbar (its command palette), so the host
 * chrome above it stays a thin language label — see CodeToolbar.
 */

const CodeCanvas: React.FC<CanvasRendererProps> = ({ item, onEdit }) => (
  <div data-luca-canvas-kind="code" style={{ flex: 1, minHeight: 0 }}>
    <Editor
      height="100%"
      language={item.language ?? "plaintext"}
      value={item.content}
      theme="vs-dark"
      onChange={(value) => onEdit?.(value ?? "")}
      options={{
        readOnly: !onEdit,
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        renderLineHighlight: "none",
        padding: { top: 16, bottom: 120 },
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        smoothScrolling: true,
        overviewRulerLanes: 0,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      }}
      loading={
        <div style={{ padding: 22, color: workspaceColor.ink3, fontSize: 12 }}>
          Loading editor…
        </div>
      }
    />
  </div>
);

export default CodeCanvas;
