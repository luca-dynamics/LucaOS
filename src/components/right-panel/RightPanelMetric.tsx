import React from "react";

import { lucaMaterialMetricStyle } from "../../styles/lucaMaterialSystem";

interface RightPanelMetricProps {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "danger";
}

// One quiet, uniform stat tile. No tinted / coloured card backgrounds — every
// tile shares the same neutral surface. Colour lands ONLY on the value, and
// ONLY for a genuine alert: "good" and "neutral" stay monochrome, so a zero or
// all-clear reads calm instead of as a green box (the vibecoded tell).
const valueColor: Record<
  NonNullable<RightPanelMetricProps["tone"]>,
  string
> = {
  neutral: "var(--luca-text-primary, var(--app-text-main))",
  good: "var(--luca-text-primary, var(--app-text-main))",
  warn: "var(--luca-warning, #e0b15a)",
  danger: "var(--luca-danger, #f87171)",
};

const RightPanelMetric: React.FC<RightPanelMetricProps> = ({
  label,
  value,
  tone = "neutral",
}) => (
  <div className="rounded-lg border p-2.5" style={lucaMaterialMetricStyle}>
    <div
      className="text-[10.5px] tracking-tight"
      style={{ color: "var(--luca-text-tertiary, var(--app-text-muted))" }}
    >
      {label}
    </div>
    <div
      className="mt-1 text-[15px] font-semibold leading-none"
      style={{ color: valueColor[tone] }}
    >
      {value}
    </div>
  </div>
);

export default RightPanelMetric;
