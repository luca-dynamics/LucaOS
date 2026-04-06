import React from "react";
import { Icon } from "./ui/Icon";

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
  const themeHex = theme?.hex || "#3b82f6";

  if (!active) return null;

  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 transition-all duration-300 group ${
        isMobile ? "p-1" : "px-2.5 py-1 rounded-full"
      } glass-blur border`}
      style={{
        backgroundColor: "var(--app-bg-tint)",
        borderColor: "var(--app-border-main)",
      }}
      title="Luca is observing your screen — click to stop"
    >
      <Icon
        name="Eye"
        variant="Linear"
        size={isMobile ? 12 : 13}
        style={{ color: themeHex }}
        className="animate-pulse"
      />
      {!isMobile && (
        <span
          className="text-[9px] font-bold tracking-widest uppercase"
          style={{ color: "var(--app-text-muted)" }}
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
