import React from "react";
import { getLucaSkinDefinition, isDarkSkin } from "../../config/lucaSkins";

export type LucaStateIconStatus =
  | "thinking"
  | "streaming"
  | "approval"
  | "loading"
  | "success"
  | "error"
  | "tool_call";

export interface LucaStateIconProps {
  status?: LucaStateIconStatus;
  size?: number;
  skinId?: string;
  className?: string;
  style?: React.CSSProperties;
  showElapsed?: boolean;
  elapsedSeconds?: number;
  label?: string;
}

/**
 * LucaStateIcon — Brand-centric, skin-aware Hologram state icon.
 * Replaces generic stars (✦) and static indicators with Luca's dynamic face/ring.
 * Dynamically resolves accent colors, glowing rims, and material polarity per skin.
 */
export const LucaStateIcon: React.FC<LucaStateIconProps> = ({
  status = "thinking",
  size = 20,
  skinId,
  className = "",
  style = {},
  showElapsed = false,
  elapsedSeconds = 0,
  label,
}) => {
  const skin = getLucaSkinDefinition(skinId);
  const dark = isDarkSkin(skinId);

  // Dynamic accent & glow from active skin definition
  const primaryAccent =
    skin?.accentProfile?.primary || (dark ? "#608dc0" : "#3d8fa6");
  const secondaryAccent =
    skin?.accentProfile?.secondary || (dark ? "#4f72a0" : "#608dc0");

  let statusColor = primaryAccent;
  let glowColor = skin?.accentProfile?.glow || `${primaryAccent}33`;

  if (status === "approval") {
    statusColor = "#f59e0b"; // Warm Gold / Amber
    glowColor = "rgba(245, 158, 11, 0.35)";
  } else if (status === "success") {
    statusColor = "#10b981"; // Emerald
    glowColor = "rgba(16, 185, 129, 0.35)";
  } else if (status === "error") {
    statusColor = "#ef4444"; // Coral Red
    glowColor = "rgba(239, 68, 68, 0.35)";
  }

  const isOrbit = status === "thinking" || status === "loading";
  const isPulse = status === "streaming" || status === "approval";

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--app-font-sans, system-ui, sans-serif)",
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(circle at 35% 30%, ${statusColor}22, ${statusColor}08)`,
          boxShadow: `0 0 10px ${glowColor}`,
          transition: "all 200ms ease",
          flexShrink: 0,
        }}
      >
        {/* Luca Hologram Core SVG */}
        <svg
          width={size * 0.75}
          height={size * 0.75}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            animation: isOrbit
              ? "spin 3s linear infinite"
              : isPulse
              ? "pulse 2s ease-in-out infinite"
              : undefined,
          }}
        >
          {/* Hologram Outer Orbit Ring */}
          <circle
            cx="12"
            cy="12"
            r="9.5"
            stroke={statusColor}
            strokeWidth="1.5"
            strokeDasharray={status === "loading" ? "6 3" : undefined}
            opacity="0.85"
          />
          {/* Hologram Inner Face / Core */}
          <circle cx="12" cy="12" r="4.5" fill={statusColor} opacity="0.9" />
          {/* Top & Bottom Hologram Crown Rays */}
          <path
            d="M12 2.5V4.5M12 19.5V21.5M2.5 12H4.5M19.5 12H21.5"
            stroke={secondaryAccent}
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      </div>

      {label && (
        <span
          style={{
            fontSize: size * 0.65,
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: dark ? "#f1f5f9" : "#1e293b",
          }}
        >
          {label}
        </span>
      )}

      {showElapsed && (
        <span
          style={{
            fontSize: size * 0.6,
            fontWeight: 500,
            fontFamily: "monospace",
            color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
          }}
        >
          {elapsedSeconds.toFixed(1)}s
        </span>
      )}
    </div>
  );
};
