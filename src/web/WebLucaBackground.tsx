import type { CSSProperties } from "react";
import type { OnboardingVisualSettings } from "../components/Onboarding/OnboardingRuntimeAdapter";
import { getDynamicContrast } from "../config/themeColors";

interface WebLucaBackgroundProps {
  visualSettings: OnboardingVisualSettings;
  theme: {
    hex: string;
    themeName?: string;
  };
}

export function WebLucaBackground({
  visualSettings,
  theme,
}: WebLucaBackgroundProps) {
  const contrast = getDynamicContrast(
    visualSettings.theme,
    visualSettings.backgroundOpacity,
  );
  const opacity = Math.max(0, Math.min(1, visualSettings.backgroundOpacity));
  const blur = Math.max(0, visualSettings.backgroundBlur);
  const style = {
    "--app-primary": theme.hex,
    "--app-text-main": contrast.text,
    "--app-text-muted": contrast.textMuted,
    "--app-border-main": contrast.border,
    "--app-bg-tint": contrast.bgTint,
    "--app-bg-opacity": opacity,
    "--app-bg-blur": `${blur}px`,
    backgroundColor: contrast.isHighContrast ? contrast.bgMain : "#08090b",
    backgroundImage: [
      `radial-gradient(ellipse at 50% 42%, ${theme.hex}0d 0%, transparent 48%)`,
      "linear-gradient(145deg, #08090b 0%, #111317 50%, #0b0d10 100%)",
    ].join(", "),
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 transition-[background-color,background-image] duration-300"
      style={style}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: contrast.bgTint,
          backdropFilter: `blur(${blur}px)`,
          opacity: Math.max(0.08, opacity * 0.72),
        }}
      />
    </div>
  );
}
