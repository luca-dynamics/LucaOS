import React from "react";

import { lucaMaterialMetricStyle } from "../../styles/lucaMaterialSystem";

interface RightPanelMetricProps {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "danger";
}

const toneClass = {
  neutral: "text-[var(--app-text-main)]",
  good: "border-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-success,#4fbf7a)_12%,transparent)] text-[var(--luca-success,#4fbf7a)]",
  warn: "border-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-warning,#f2b23e)_12%,transparent)] text-[var(--luca-warning,#f2b23e)]",
  danger: "border-[color-mix(in_srgb,var(--luca-danger,#f87171)_32%,transparent)] bg-[color-mix(in_srgb,var(--luca-danger,#f87171)_12%,transparent)] text-[var(--luca-danger,#f87171)]",
};

// A single stat tile. Calm label + value (panel-interiors-target): no
// uppercase-tracked micro-shout, no black weight; tone colours are kept so a
// warning still reads at a glance.
const RightPanelMetric: React.FC<RightPanelMetricProps> = ({ label, value, tone = "neutral" }) => (
  <div className={`rounded-xl border p-2 ${toneClass[tone]}`} style={tone === "neutral" ? lucaMaterialMetricStyle : undefined}>
    <div className="text-[10px] tracking-tight opacity-70">{label}</div>
    <div className="mt-1 text-sm font-semibold leading-none">{value}</div>
  </div>
);

export default RightPanelMetric;
