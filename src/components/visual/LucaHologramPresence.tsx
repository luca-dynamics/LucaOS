import React from "react";

export type LucaHologramPresenceState =
  | "idle"
  | "preparing"
  | "ready"
  | "attention";

interface LucaHologramPresenceProps {
  size?: number;
  state?: LucaHologramPresenceState;
  themeColor?: string;
  className?: string;
}

export function LucaHologramPresence({
  size = 220,
  state = "idle",
  themeColor = "var(--app-primary, #67e8f9)",
  className = "",
}: LucaHologramPresenceProps) {
  const isActive = state === "preparing";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size, color: themeColor }}
      data-state={state}
      aria-label={`Luca presence ${state}`}
    >
      <div
        className={`absolute inset-[9%] rounded-full border border-current/20 ${
          isActive ? "motion-safe:animate-[spin_12s_linear_infinite]" : ""
        }`}
      />
      <div className="absolute inset-[18%] rounded-full bg-current/10 blur-3xl motion-safe:animate-pulse" />
      <img
        src="/icon.png"
        alt="Luca"
        className="relative h-[76%] w-[76%] object-contain opacity-80 motion-safe:animate-[pulse_4s_ease-in-out_infinite]"
        style={{
          filter:
            "brightness(1.2) contrast(1.25) drop-shadow(0 0 18px currentColor) drop-shadow(0 0 42px currentColor)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-[12%] rounded-full opacity-20"
        style={{
          background:
            "repeating-linear-gradient(to bottom, transparent 0 8px, currentColor 9px, transparent 10px)",
        }}
      />
    </div>
  );
}
