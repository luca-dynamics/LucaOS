import React, { useState, useEffect } from "react";
import { setHexAlpha } from "../../config/themeColors";
import { isElectron as checkElectron } from "../../utils/env";
import {
  buildLucaAtmosphereBackground,
  normalizeLucaAtmosphere,
  type LucaAtmosphere,
} from "../../config/lucaAtmospheres";

interface LiquidBackgroundProps {
  theme?: {
    hex: string;
    themeName: string;
  };
  color?: string;
  amplitude?: number;
  isThinking?: boolean;
  isSpeaking?: boolean;
  opacity?: number;
  className?: string;
  atmosphere?: LucaAtmosphere;
}

export const LiquidBackground: React.FC<LiquidBackgroundProps> = ({
  theme,
  color,
  amplitude = 0,
  isThinking = false,
  isSpeaking = false,
  opacity,
  className = "",
  atmosphere,
}) => {
  const hex = color || theme?.hex || "#4f8cff";
  const fallbackAccentSoft = setHexAlpha(hex, 0.16);
  const resolvedOpacity =
    typeof opacity === "number" ? opacity : "var(--app-bg-opacity, 0.3)";
  const tokenBackgroundBase = "var(--luca-background-base, var(--app-bg-main, #101215))";
  const tokenBackgroundLiquid = "var(--luca-background-liquid, transparent)";
  const tokenAccentPrimary = `var(--luca-accent-primary, ${hex})`;
  const tokenAccentSoft = `var(--luca-accent-soft, ${fallbackAccentSoft})`;
  const tokenShadowSoft = "var(--luca-shadow-soft, 0 24px 80px rgba(0, 0, 0, 0.22))";
  const tokenBlurLevel = "var(--luca-blur-level, var(--app-bg-blur, 40px))";
  const isLight =
    theme?.themeName?.toLowerCase() === "lightcream" ||
    theme?.themeName?.toLowerCase() === "lucagent" ||
    theme?.themeName?.toLowerCase() === "light";

  const isLightCream = theme?.themeName?.toLowerCase() === "lightcream";

  const [isElectron, setIsElectron] = useState(() => checkElectron());

  useEffect(() => {
    if (!isElectron) {
      const verify = () => {
        if (checkElectron()) setIsElectron(true);
      };
      
      const t1 = setTimeout(verify, 100);
      const t2 = setTimeout(verify, 500);
      const t3 = setTimeout(verify, 1500);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [isElectron]);

  const isWeb = !isElectron;
  const resolvedAtmosphere = normalizeLucaAtmosphere(atmosphere);
  const atmosphereBackground = buildLucaAtmosphereBackground(resolvedAtmosphere);

  const webBackground =
    "var(--luca-background-liquid, var(--luca-background-elevated, var(--luca-background-base, #101215)))";

  return (
    <div
      className={`absolute inset-0 -z-50 overflow-hidden pointer-events-none select-none ${className}`}
      style={{
        backgroundColor: isWeb
          ? "transparent"
          : "transparent",
      }}
    >
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: isWeb
            ? webBackground
            : `color-mix(in srgb, ${tokenBackgroundBase} calc(min(100%, (${resolvedOpacity}) * 100% + max(0%, ((${resolvedOpacity}) - 0.95) * 2000%))), transparent)`,
          filter: "none",
          transform: "translateZ(0)",
          willChange: "opacity",
        }}
      />

      {!isLightCream && (
        <div
          className={`absolute inset-0 transition-all duration-1000 ${isThinking ? "animate-pulse" : ""}`}
          style={{
            background: resolvedAtmosphere.enabled
              ? atmosphereBackground
              : `${tokenBackgroundLiquid}, radial-gradient(ellipse at 50% 12%, color-mix(in srgb, ${tokenAccentPrimary} ${isLight ? 10 : 12}%, transparent) 0%, transparent 62%), radial-gradient(ellipse at 85% 85%, color-mix(in srgb, ${tokenAccentSoft} ${isSpeaking ? 34 : 22}%, transparent) 0%, transparent 54%), radial-gradient(ellipse at 15% 75%, color-mix(in srgb, ${tokenAccentSoft} ${isThinking ? 32 : 18}%, transparent) 0%, transparent 52%)`,
            filter: resolvedAtmosphere.enabled
              ? `blur(${resolvedAtmosphere.softnessPx}px)`
              : `blur(calc(${tokenBlurLevel} * (1 - clamp(0, ((var(--app-bg-opacity, 0.3) - 0.82) / 0.18), 1))))`,
            boxShadow: tokenShadowSoft,
            opacity:
              "calc((1 - var(--app-bg-opacity, 0.3)) * (1 - clamp(0, ((var(--app-bg-opacity, 0.3) - 0.9) / 0.1), 1)) * 0.9)",
            transform: `translateZ(0) scale(${1 + amplitude * 0.05})`,
            backgroundSize:
              resolvedAtmosphere.enabled && resolvedAtmosphere.motion === "calm"
                ? "115% 115%"
                : undefined,
            animation:
              resolvedAtmosphere.enabled && resolvedAtmosphere.motion === "calm"
                ? "luca-atmosphere-drift 18s ease-in-out infinite alternate"
                : undefined,
            willChange: "filter, transform",
          }}
        />
      )}

      {resolvedAtmosphere.enabled && resolvedAtmosphere.noise > 0 && (
        <div
          className="absolute inset-0 mix-blend-soft-light pointer-events-none"
          style={{
            opacity: resolvedAtmosphere.noise,
            backgroundImage:
              `url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.75'/%3E%3C/svg%3E")`,
          }}
        />
      )}

      {/* Grid Overlay for LightCream Theme */}
      {isLightCream && (
        <div
          className="absolute inset-0 transition-opacity duration-1000"
          style={{
            opacity:
              "calc((1 - var(--app-bg-opacity, 0.7)) * (1 - clamp(0, ((var(--app-bg-opacity, 0.7) - 0.9) / 0.1), 1)) * 0.18)",
            backgroundImage: `
              linear-gradient(to right, #6c6a58 1px, transparent 1px),
              linear-gradient(to bottom, #6c6a58 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      )}

      {/* 3. Subtle Noise - Disabled for Web to match Apple clean look */}
      {!isWeb && (
        <div
          className="absolute inset-0 mix-blend-overlay pointer-events-none transition-opacity duration-1000"
          style={{
            opacity:
              "calc((1 - var(--app-bg-opacity, 0.3)) * (1 - clamp(0, ((var(--app-bg-opacity, 0.3) - 0.7) / 0.3), 1)) * 0.025)",
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      )}
    </div>
  );
};
