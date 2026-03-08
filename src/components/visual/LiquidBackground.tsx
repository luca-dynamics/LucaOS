import React from "react";
import { setHexAlpha } from "../../config/themeColors";

interface LiquidBackgroundProps {
  theme: {
    hex: string;
    themeName: string;
  };
  className?: string;
}

export const LiquidBackground: React.FC<LiquidBackgroundProps> = ({
  theme,
  className = "",
}) => {
  const hex = theme.hex;
  const isLight = theme.themeName === "lucagent" || theme.themeName === "light";

  return (
    <div
      className={`absolute inset-0 -z-50 overflow-hidden pointer-events-none select-none ${className}`}
    >
      <div
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: isLight
            ? `radial-gradient(ellipse at 50% -10%, ${setHexAlpha(hex, 0.3)} 0%, transparent 60%), rgba(255, 255, 255, var(--app-bg-opacity, 0.5))`
            : `radial-gradient(ellipse at 50% 20%, ${setHexAlpha(hex, 0.3)} 0%, transparent 60%), radial-gradient(ellipse at 85% 85%, ${setHexAlpha(hex, 0.2)} 0%, transparent 50%), radial-gradient(ellipse at 15% 75%, ${setHexAlpha(hex, 0.15)} 0%, transparent 50%), rgba(18, 18, 18, var(--app-bg-opacity, 0.3))`,
          filter: "blur(var(--app-bg-blur, 40px))",
        }}
      />

      {/* 3. Subtle Noise */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
