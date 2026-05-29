import React from "react";

interface RightPanelMetricProps {
  label: string;
  value: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "danger";
}

const toneClass = {
  neutral: "border-white/10 bg-white/[0.03] text-[var(--app-text-main)]",
  good: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
  warn: "border-amber-500/20 bg-amber-500/10 text-amber-200",
  danger: "border-red-500/20 bg-red-500/10 text-red-200",
};

const RightPanelMetric: React.FC<RightPanelMetricProps> = ({ label, value, tone = "neutral" }) => (
  <div className={`rounded-xl border p-2 ${toneClass[tone]}`}>
    <div className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-60">{label}</div>
    <div className="mt-1 text-sm font-black leading-none">{value}</div>
  </div>
);

export default RightPanelMetric;
