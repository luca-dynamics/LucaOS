import type { CSSProperties } from "react";
import type { OnboardingVisualSettings } from "../components/Onboarding/OnboardingRuntimeAdapter";
import { getDynamicContrast } from "../config/themeColors";
import { buildLucaAppearanceCssVariables } from "../config/lucaAppearanceTokens";

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
  const lucaVariables = buildLucaAppearanceCssVariables({
    theme: visualSettings.theme,
    backgroundOpacity: opacity,
    backgroundBlur: blur,
  });
  const style = {
    ...lucaVariables,
    "--app-primary": theme.hex,
    "--app-text-main": contrast.text,
    "--app-text-muted": contrast.textMuted,
    "--app-border-main": contrast.border,
    "--app-bg-tint": contrast.bgTint,
    "--app-bg-opacity": opacity,
    "--app-bg-blur": `${blur}px`,
    backgroundColor: "var(--luca-background-base, var(--app-bg-main, #101215))",
    backgroundImage: [
      `radial-gradient(ellipse at 50% 42%, color-mix(in srgb, var(--luca-accent-primary, ${theme.hex}) 8%, transparent) 0%, transparent 48%)`,
      "var(--luca-background-liquid, linear-gradient(145deg, var(--luca-background-base, #101215) 0%, var(--luca-background-elevated, #181a1f) 100%))",
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
          backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
          backdropFilter: `blur(${blur}px)`,
          opacity: Math.max(0.08, opacity * 0.72),
        }}
      />
    </div>
  );
}
