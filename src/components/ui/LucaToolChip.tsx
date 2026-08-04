import React, { useState } from "react";
import { LucaStateIcon } from "./LucaStateIcon";
import { isDarkSkin } from "../../config/lucaSkins";

export interface LucaToolCall {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  result?: unknown;
  status?: "executing" | "success" | "error";
}

export interface LucaToolChipProps {
  tools: LucaToolCall[];
  skinId?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * LucaToolChip — Collapsible tool calls & execution chip container.
 * Beautiful UI Primitive #05, tailored to LucaOS with skin awareness.
 */
export const LucaToolChip: React.FC<LucaToolChipProps> = ({
  tools = [],
  skinId,
  className = "",
  style = {},
}) => {
  const dark = isDarkSkin(skinId);
  const [expanded, setExpanded] = useState(false);

  if (tools.length === 0) return null;

  const executingCount = tools.filter((t) => t.status === "executing").length;
  const successCount = tools.filter((t) => t.status === "success").length;

  return (
    <div
      className={`inline-flex flex-col gap-1.5 ${className}`}
      style={{
        fontFamily: "var(--app-font-sans, system-ui, sans-serif)",
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 shadow-sm"
        style={{
          background: dark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)",
          borderColor: dark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
          color: dark ? "#e2e8f0" : "#1e293b",
        }}
      >
        <LucaStateIcon
          status={executingCount > 0 ? "loading" : "success"}
          size={14}
          skinId={skinId}
        />
        <span>
          ⚡ {tools.length} tool call{tools.length > 1 ? "s" : ""}
          {executingCount > 0 ? ` (${executingCount} running)` : ""}
        </span>
        <span className="text-[10px] opacity-60 ml-1">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded Payload Inspector */}
      {expanded && (
        <div
          className="rounded-2xl border p-3 text-xs space-y-2 shadow-md animate-fade-in"
          style={{
            background: dark ? "rgba(15, 23, 42, 0.9)" : "rgba(248, 250, 252, 0.95)",
            borderColor: dark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
            maxWidth: 400,
          }}
        >
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="p-2 rounded-xl border bg-black/5 dark:bg-white/5 border-white/10 space-y-1 font-mono text-[11px]"
            >
              <div className="flex items-center justify-between font-semibold">
                <span style={{ color: dark ? "#38bdf8" : "#0284c7" }}>
                  {tool.name}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-md uppercase"
                  style={{
                    background:
                      tool.status === "success"
                        ? "rgba(16, 185, 129, 0.2)"
                        : tool.status === "executing"
                        ? "rgba(245, 158, 11, 0.2)"
                        : "rgba(239, 68, 68, 0.2)",
                    color:
                      tool.status === "success"
                        ? "#10b981"
                        : tool.status === "executing"
                        ? "#f59e0b"
                        : "#ef4444",
                  }}
                >
                  {tool.status || "ready"}
                </span>
              </div>
              {tool.args && (
                <div className="text-[10px] opacity-75 truncate">
                  args: {JSON.stringify(tool.args)}
                </div>
              )}
              {tool.result !== undefined && (
                <div className="text-[10px] opacity-75 truncate">
                  result: {JSON.stringify(tool.result)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
