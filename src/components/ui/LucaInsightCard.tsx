import React from "react";
import { LucaStateIcon } from "./LucaStateIcon";
import { isDarkSkin } from "../../config/lucaSkins";

export interface LucaInsightMetric {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
}

export interface LucaInsightCardProps {
  title: string;
  subtitle?: string;
  metrics?: LucaInsightMetric[];
  chartData?: number[];
  queryActionText?: string;
  onQueryAction?: () => void;
  skinId?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * LucaInsightCard — Agent insights & metrics card with SVG trend chart.
 * Beautiful UI Primitive #15, tailored to LucaOS with skin awareness.
 */
export const LucaInsightCard: React.FC<LucaInsightCardProps> = ({
  title,
  subtitle,
  metrics = [],
  chartData = [12, 18, 14, 26, 32, 28, 42],
  queryActionText,
  onQueryAction,
  skinId,
  className = "",
  style = {},
}) => {
  const dark = isDarkSkin(skinId);

  // Compute SVG sparkline path from chartData
  const maxVal = Math.max(...chartData, 1);
  const width = 280;
  const height = 60;
  const points = chartData
    .map((val, idx) => {
      const x = (idx / (chartData.length - 1)) * width;
      const y = height - (val / maxVal) * (height - 10) - 5;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div
      className={`rounded-2xl border p-4 shadow-lg transition-all duration-200 ${className}`}
      style={{
        background: dark ? "rgba(30, 36, 46, 0.85)" : "rgba(255, 255, 255, 0.85)",
        borderColor: dark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
        WebkitBackdropFilter: "blur(16px)",
        backdropFilter: "blur(16px)",
        fontFamily: "var(--app-font-sans, system-ui, sans-serif)",
        maxWidth: 420,
        ...style,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <LucaStateIcon status="streaming" size={18} skinId={skinId} />
          <div>
            <h4 className="text-sm font-semibold leading-snug">{title}</h4>
            {subtitle && (
              <p
                className="text-[11px]"
                style={{ color: dark ? "#94a3b8" : "#64748b" }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          {metrics.map((m, idx) => (
            <div key={idx} className="p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10">
              <span className="text-[11px] opacity-75 block">{m.label}</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-base font-bold font-mono">{m.value}</span>
                {m.change && (
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: m.isPositive !== false ? "#10b981" : "#ef4444" }}
                  >
                    {m.change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mini SVG Sparkline Chart */}
      <div className="my-2 p-2 rounded-xl bg-black/10 dark:bg-white/5 border border-white/10 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12 stroke-current overflow-visible">
          <polyline
            fill="none"
            stroke={dark ? "#38bdf8" : "#0284c7"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
        </svg>
      </div>

      {/* Optional Query Action Button */}
      {queryActionText && (
        <button
          type="button"
          onClick={onQueryAction}
          className="w-full mt-2 text-[11px] px-3 py-1.5 rounded-full border bg-white/5 hover:bg-white/10 transition-colors text-left font-medium"
          style={{
            borderColor: dark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)",
          }}
        >
          💡 {queryActionText}
        </button>
      )}
    </div>
  );
};
