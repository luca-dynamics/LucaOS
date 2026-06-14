import React from "react";
import { Icon, IconProvider } from "../ui/Icon";

interface ModeCardProps {
  iconName: string;
  iconProvider?: IconProvider;
  title: string;
  description: string;
  onClick: () => void;
}

/**
 * Glassmorphic mode selection card
 * Theme-aware with support for light and dark modes
 */
const ModeCard: React.FC<ModeCardProps> = ({
  iconName,
  iconProvider,
  title,
  description,
  onClick,
}) => {
  const glowColor =
    "radial-gradient(circle at center, var(--app-text-main)33, transparent 70%)";

  return (
    <button
      onClick={onClick}
      className="group relative w-full border rounded-2xl p-6 sm:p-8 transition-all duration-300 glass-blur text-center touch-manipulation overflow-hidden active:scale-95 hover:bg-[var(--app-bg-tint)]"
      style={{ borderColor: "var(--app-border-main)" }}
    >
      {/* Glow effect on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none"
        style={{
          background: glowColor,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div className="mb-2 sm:mb-4 group-hover:scale-110 transition-transform duration-300 flex justify-center">
          <Icon
            name={iconName} 
            provider={iconProvider} 
            variant="Linear"
            className="w-12 h-12 sm:w-16 sm:h-16"
            color="var(--app-text-main)"
          />
        </div>

        {/* Title */}
        <h3
          className="text-lg sm:text-xl font-bold uppercase tracking-wider"
          style={{ color: "var(--app-text-main)" }}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          className="text-xs sm:text-sm transition-colors mt-2 opacity-80"
          style={{ color: "var(--app-text-muted)" }}
        >
          {description}
        </p>

        {/* Call to action button */}
        <div
          className="mt-3 sm:mt-4 px-4 sm:px-6 py-2 border rounded-lg transition-all inline-block text-xs sm:text-sm font-medium tracking-wide"
          style={{
            color: "var(--app-text-main)",
            borderColor: "var(--app-border-main)",
            backgroundColor: "var(--app-bg-tint)",
          }}
        >
          Choose
        </div>
      </div>
    </button>
  );
};

export default ModeCard;
