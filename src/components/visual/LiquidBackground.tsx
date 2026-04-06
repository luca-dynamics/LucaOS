import React, { useState, useEffect } from "react";
import { setHexAlpha } from "../../config/themeColors";
import { isElectron as checkElectron } from "../../utils/env";

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
  const isLight =
    theme.themeName?.toLowerCase() === "lightcream" ||
    theme.themeName?.toLowerCase() === "lucagent" ||
    theme.themeName?.toLowerCase() === "light";
    
  const isLightCream = theme.themeName?.toLowerCase() === "lightcream";

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

  // Apple UI Aesthetics for Web Fallback
  const webBackground = isLightCream 
    ? "#E5E1CD"
    : isLight
      ? "linear-gradient(180deg, #f0f0f5 0%, #e5e5eb 100%)"
      : "radial-gradient(circle at 50% 50%, #262626 0%, #1c1c1c 100%)";

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
            : isLight
              ? isLightCream
                ? `rgba(229, 225, 205, var(--app-bg-opacity, 0.7))`
                : `radial-gradient(ellipse at 50% -10%, ${setHexAlpha(hex, 0.3)} 0%, transparent 60%), rgba(255, 255, 255, var(--app-bg-opacity, 0.5))`
              : `radial-gradient(ellipse at 50% 20%, ${setHexAlpha(hex, 0.3)} 0%, transparent 60%), radial-gradient(ellipse at 85% 85%, ${setHexAlpha(hex, 0.2)} 0%, transparent 50%), radial-gradient(ellipse at 15% 75%, ${setHexAlpha(hex, 0.15)} 0%, transparent 50%), rgba(18, 18, 18, var(--app-bg-opacity, 0.3))`,
          filter: isLightCream ? "none" : "blur(var(--app-bg-blur, 40px))",
          transform: "translateZ(0)",
          willChange: "filter",
        }}
      />

      {/* Grid Overlay for LightCream Theme */}
      {isLightCream && (
        <div 
          className="absolute inset-0 opacity-[0.12] transition-opacity duration-1000"
          style={{
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
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      )}
    </div>
  );
};
