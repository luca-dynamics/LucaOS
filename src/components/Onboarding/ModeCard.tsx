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
  // Theme-aware colors using Dynamic Contrast Variables
  const bgCard = "bg-transparent";
  const hoverBg = "hover:bg-[var(--app-bg-tint)]";
  
  const textMain = "var(--app-text-main)";
  const textMuted = "var(--app-text-muted)";
  const borderMain = "var(--app-border-main)";
  
  const glowColor = "radial-gradient(circle at center, var(--app-text-main)33, transparent 70%)";

  return (
    <button
      onClick={onClick}
      className={`
        group
        relative
        w-full
        ${bgCard}
        border
        rounded-2xl 
        ${hoverBg}
        hover:border-[var(--app-border-hover)]
        active:scale-95
        transition-all 
        duration-300
        glass-blur
        text-center
        touch-manipulation
        overflow-hidden
      `}
      style={{
        padding: "clamp(1rem, 5vmin, 2.5rem)",
        gap: "clamp(0.5rem, 2vmin, 1.25rem)",
        borderColor: borderMain
      }}
    >
      {/* Glow effect on hover */}
      <div
        className="
          absolute inset-0 
          opacity-0 
          group-hover:opacity-20 
          transition-opacity 
          duration-300
          pointer-events-none
        "
        style={{
          background: glowColor,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Icon */}
        <div 
          className="group-hover:scale-110 transition-transform duration-300 flex justify-center"
          style={{ marginBottom: "2vmin" }}
        >
          <Icon 
            name={iconName} 
            provider={iconProvider} 
            variant="Linear"
            style={{ width: "clamp(2rem, 10vmin, 5rem)", height: "clamp(2rem, 10vmin, 5rem)" }}
            color={textMain}
          />
        </div>

        {/* Title */}
        <h3
          className="font-bold uppercase tracking-wider"
          style={{ 
            fontSize: "clamp(0.9rem, 3.5vmin, 1.4rem)",
            color: textMain
          }}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          className="transition-colors opacity-80"
          style={{ 
            fontSize: "clamp(0.5rem, 1.6vmin, 0.8rem)", 
            marginTop: "1vmin",
            color: textMuted
          }}
        >
          {description}
        </p>

        {/* Call to action button */}
        <div
          className={`
          px-[3vmin] py-[1vmin] 
          border
          rounded-[1vmin] 
          hover:border-[var(--app-border-hover)]
          transition-all
          inline-block
          font-medium
          tracking-wide
        `}
          style={{ 
            marginTop: "2.5vmin",
            fontSize: "clamp(0.55rem, 1.6vmin, 0.8rem)",
            color: textMain,
            borderColor: borderMain,
            backgroundColor: "var(--app-bg-tint)"
          }}
        >
          Choose
        </div>
      </div>
    </button>
  );
};

export default ModeCard;
