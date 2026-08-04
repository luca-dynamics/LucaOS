import React from "react";
import { isDarkSkin } from "../../config/lucaSkins";

export interface LucaFilterOption {
  id: string;
  label: string;
  count?: number;
  color?: string;
}

export interface LucaFilterChipsProps {
  options: LucaFilterOption[];
  activeId: string;
  onSelect: (id: string) => void;
  skinId?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * LucaFilterChips — Status & Category filter pills component.
 * Beautiful UI Primitive #12, tailored to LucaOS with skin awareness.
 */
export const LucaFilterChips: React.FC<LucaFilterChipsProps> = ({
  options = [],
  activeId,
  onSelect,
  skinId,
  className = "",
  style = {},
}) => {
  const dark = isDarkSkin(skinId);

  return (
    <div
      className={`flex items-center gap-1.5 overflow-x-auto py-1 ${className}`}
      style={{
        scrollbarWidth: "none",
        fontFamily: "var(--app-font-sans, system-ui, sans-serif)",
        ...style,
      }}
    >
      {options.map((opt) => {
        const isActive = opt.id === activeId;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 flex-shrink-0 shadow-sm"
            style={{
              background: isActive
                ? dark
                  ? "#38bdf8"
                  : "#0284c7"
                : dark
                ? "rgba(255, 255, 255, 0.06)"
                : "rgba(0, 0, 0, 0.05)",
              color: isActive ? "#ffffff" : dark ? "#cbd5e1" : "#475569",
              border: isActive
                ? "none"
                : dark
                ? "1px solid rgba(255, 255, 255, 0.1)"
                : "1px solid rgba(0, 0, 0, 0.1)",
            }}
          >
            {opt.color && (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: opt.color }}
              />
            )}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-semibold"
                style={{
                  background: isActive
                    ? "rgba(255, 255, 255, 0.25)"
                    : dark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.08)",
                }}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
