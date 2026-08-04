import React, { useState } from "react";
import { isDarkSkin } from "../../config/lucaSkins";

export interface LucaDiffLine {
  type: "add" | "delete" | "normal";
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface LucaDiffTableProps {
  filename?: string;
  lines: LucaDiffLine[];
  skinId?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * LucaDiffTable — Unified code and data modification diff view primitive.
 * Beautiful UI Primitive #10, tailored to LucaOS with skin awareness.
 */
export const LucaDiffTable: React.FC<LucaDiffTableProps> = ({
  filename,
  lines = [],
  skinId,
  className = "",
  style = {},
}) => {
  const dark = isDarkSkin(skinId);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const rawText = lines
      .map((l) => `${l.type === "add" ? "+" : l.type === "delete" ? "-" : " "} ${l.content}`)
      .join("\n");
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-2xl border overflow-hidden shadow-md font-mono text-[11.5px] ${className}`}
      style={{
        background: dark ? "rgba(15, 23, 42, 0.85)" : "rgba(248, 250, 252, 0.95)",
        borderColor: dark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        ...style,
      }}
    >
      {/* Header Bar */}
      {filename && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-black/10">
          <span className="font-semibold text-xs text-inherit">{filename}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="text-[11px] px-2 py-0.5 rounded-md border border-white/10 hover:bg-white/10 transition-colors opacity-80"
          >
            {copied ? "✓ Copied" : "Copy Diff"}
          </button>
        </div>
      )}

      {/* Code Lines */}
      <div className="overflow-x-auto py-1">
        {lines.map((line, idx) => {
          const isAdd = line.type === "add";
          const isDelete = line.type === "delete";

          return (
            <div
              key={idx}
              className="flex items-center px-2 py-0.5 leading-relaxed transition-colors hover:bg-white/5"
              style={{
                background: isAdd
                  ? "rgba(16, 185, 129, 0.12)"
                  : isDelete
                  ? "rgba(239, 68, 68, 0.12)"
                  : "transparent",
                color: isAdd
                  ? "#10b981"
                  : isDelete
                  ? "#ef4444"
                  : dark
                  ? "#cbd5e1"
                  : "#334155",
              }}
            >
              <span className="w-8 text-right select-none opacity-40 pr-2">
                {line.oldLineNumber || ""}
              </span>
              <span className="w-8 text-right select-none opacity-40 pr-3">
                {line.newLineNumber || ""}
              </span>
              <span className="w-4 select-none font-bold">
                {isAdd ? "+" : isDelete ? "-" : " "}
              </span>
              <span className="flex-1 whitespace-pre">{line.content}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
