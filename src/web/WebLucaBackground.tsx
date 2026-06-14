import type { CSSProperties, PropsWithChildren } from "react";
import type { OnboardingVisualSettings } from "../components/Onboarding/OnboardingRuntimeAdapter";
import { getDynamicContrast, getThemeColors } from "../config/themeColors";

interface WebLucaBackgroundProps extends PropsWithChildren {
  visualSettings: OnboardingVisualSettings;
}

export function WebLucaBackground({
  children,
  visualSettings,
}: WebLucaBackgroundProps) {
  const theme = getThemeColors(visualSettings.theme);
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
    backgroundColor: contrast.isHighContrast ? contrast.bgMain : "#05070b",
    backgroundImage: [
      `radial-gradient(circle at 18% 12%, ${theme.hex}38, transparent 38%)`,
      `radial-gradient(circle at 82% 88%, ${theme.hex}20, transparent 42%)`,
      "linear-gradient(145deg, #05070b 0%, #0b1019 52%, #05070b 100%)",
    ].join(", "),
  } as CSSProperties;

  return (
    <main
      className="relative h-screen w-full overflow-hidden transition-[background-color,background-image] duration-300"
      style={style}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundColor: contrast.bgTint,
          backdropFilter: `blur(${blur}px)`,
          opacity: Math.max(0.12, opacity),
        }}
      />
      {children}
    </main>
  );
}
