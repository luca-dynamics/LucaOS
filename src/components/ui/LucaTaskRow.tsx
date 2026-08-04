import React, { useState } from "react";
import { LucaStateIcon } from "./LucaStateIcon";
import { isDarkSkin } from "../../config/lucaSkins";

export interface LucaSubtask {
  id: string;
  label: string;
  count?: string;
  completed?: boolean;
}

export interface LucaTaskRowProps {
  id: string;
  title: string;
  subtitle?: string;
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED" | "DRAFT";
  subtasks?: LucaSubtask[];
  skinId?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * LucaTaskRow — Live agent task status row primitive.
 * Beautiful UI Primitive #06, tailored to LucaOS with skin awareness.
 */
export const LucaTaskRow: React.FC<LucaTaskRowProps> = ({
  title,
  subtitle,
  status,
  subtasks = [],
  skinId,
  className = "",
  style = {},
}) => {
  const dark = isDarkSkin(skinId);
  const [expanded, setExpanded] = useState(false);

  const statusTone =
    status === "COMPLETED"
      ? "#10b981"
      : status === "FAILED"
      ? "#ef4444"
      : status === "IN_PROGRESS"
      ? "#3b82f6"
      : "#94a3b8";

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${className}`}
      style={{
        background: dark ? "rgba(30, 36, 46, 0.7)" : "rgba(255, 255, 255, 0.7)",
        borderColor: dark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        fontFamily: "var(--app-font-sans, system-ui, sans-serif)",
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => subtasks.length > 0 && setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-3 min-w-0">
          <LucaStateIcon
            status={
              status === "IN_PROGRESS"
                ? "loading"
                : status === "COMPLETED"
                ? "success"
                : status === "FAILED"
                ? "error"
                : "thinking"
            }
            size={18}
            skinId={skinId}
          />
          <div className="min-w-0 flex-1 truncate">
            <h5 className="text-xs font-semibold truncate text-inherit">{title}</h5>
            {subtitle && (
              <p
                className="text-[11px] truncate mt-0.5"
                style={{ color: dark ? "#94a3b8" : "#64748b" }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span
            className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
            style={{
              background: `${statusTone}20`,
              color: statusTone,
            }}
          >
            {status}
          </span>
          {subtasks.length > 0 && (
            <span className="text-xs opacity-60 ml-1">{expanded ? "▲" : "▼"}</span>
          )}
        </div>
      </button>

      {/* Expandable Subtask Details */}
      {expanded && subtasks.length > 0 && (
        <div className="px-3.5 pb-3 pt-1 border-t border-white/10 space-y-1.5 bg-black/10">
          {subtasks.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between text-[11px]"
              style={{ color: dark ? "#cbd5e1" : "#475569" }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: sub.completed ? "#10b981" : statusTone }}>
                  {sub.completed ? "✓" : "•"}
                </span>
                <span>{sub.label}</span>
              </div>
              {sub.count && (
                <span className="font-mono text-[10px] opacity-70">{sub.count}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
