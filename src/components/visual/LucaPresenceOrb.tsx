import React from "react";

export type LucaPresenceOrbState =
  | "idle"
  | "preparing"
  | "listening"
  | "thinking"
  | "speaking"
  | "ready"
  | "error";

interface LucaPresenceOrbProps {
  state?: LucaPresenceOrbState;
  amplitude?: number;
  size?: number;
  themeColor?: string;
  className?: string;
}

export function LucaPresenceOrb({
  state = "idle",
  amplitude = 0,
  size = 42,
  themeColor = "var(--app-primary, #67e8f9)",
  className = "",
}: LucaPresenceOrbProps) {
  const level = Math.max(0, Math.min(1, amplitude > 1 ? amplitude / 255 : amplitude));
  const active = !["idle", "ready"].includes(state);
  const color = state === "error" ? "var(--app-danger, #f87171)" : themeColor;

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size, color }}
      data-state={state}
      aria-label={`Luca voice presence ${state}`}
    >
      <div
        className={`absolute inset-0 rounded-full border border-current/30 ${
          active ? "motion-safe:animate-[spin_5s_linear_infinite]" : ""
        }`}
        style={{ borderStyle: "dashed" }}
      />
      <div
        className="absolute rounded-full bg-current/15 blur-md transition-transform duration-300 motion-safe:animate-pulse"
        style={{
          inset: "19%",
          transform: `scale(${1 + level * 0.35})`,
        }}
      />
      <div
        className="relative rounded-[46%_54%_52%_48%] bg-current shadow-[0_0_18px_currentColor] transition-transform duration-150"
        style={{
          width: "38%",
          height: "38%",
          transform: `scale(${1 + level * 0.45})`,
          opacity: state === "idle" ? 0.55 : 0.9,
        }}
      />
    </div>
  );
}
