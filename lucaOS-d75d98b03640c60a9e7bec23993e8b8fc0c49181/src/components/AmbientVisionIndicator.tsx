import React from "react";
import { Eye, EyeOff } from "lucide-react";

interface AmbientVisionIndicatorProps {
  active: boolean;
  onToggle: () => void;
  theme: any;
  isMobile?: boolean;
}

/**
 * AmbientVisionIndicator — Shows when Luca is actively observing the screen.
 * Pulsing eye icon that can be clicked to toggle the ambient vision loop.
 */
const AmbientVisionIndicator: React.FC<AmbientVisionIndicatorProps> = ({
  active,
  onToggle,
  theme,
  isMobile = false,
}) => {
  const isLight = theme?.themeName?.toLowerCase() === "lucagent";
  const themeHex = theme?.hex || "#3b82f6";

  if (!active) return null;

  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 transition-all duration-300 group ${
        isMobile ? "p-1" : "px-2.5 py-1 rounded-full"
      } ${
        isLight
          ? "bg-blue-50/80 border border-blue-200/50 hover:bg-blue-100/80"
          : "bg-white/5 border border-white/10 hover:bg-white/15"
      }`}
      title="Luca is observing your screen — click to stop"
    >
      <Eye
        size={isMobile ? 12 : 13}
        style={{ color: themeHex }}
        className="animate-pulse"
      />
      {!isMobile && (
        <span
          className={`text-[9px] font-bold tracking-widest uppercase ${
            isLight ? "text-gray-500" : "text-white/50"
          }`}
        >
          VISION
        </span>
      )}
      <span
        className="relative flex h-1.5 w-1.5"
        style={{ display: active ? "flex" : "none" }}
      >
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: themeHex }}
        />
        <span
          className="relative inline-flex rounded-full h-1.5 w-1.5"
          style={{ backgroundColor: themeHex }}
        />
      </span>
    </button>
  );
};

export default AmbientVisionIndicator;
