import React from "react";

interface ModeCardProps {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  isLightTheme?: boolean;
}

/**
 * Glassmorphic mode selection card
 * Theme-aware with support for light and dark modes
 */
const ModeCard: React.FC<ModeCardProps> = ({
  icon,
  title,
  description,
  onClick,
  isLightTheme = false,
}) => {
  // Theme-aware colors
  const bgCard = isLightTheme ? "bg-slate-200/60" : "bg-white/5";
  const borderCard = isLightTheme ? "border-slate-300" : "border-white/20";
  const hoverBg = isLightTheme ? "hover:bg-slate-200/80" : "hover:bg-white/10";
  const hoverBorder = isLightTheme
    ? "hover:border-slate-400"
    : "hover:border-white/50";
  const textTitle = isLightTheme ? "text-slate-900" : "text-white";
  const textDesc = isLightTheme ? "text-slate-800" : "text-white/60";
  const textDescHover = isLightTheme
    ? "group-hover:text-slate-900"
    : "group-hover:text-white/90";
  const btnBg = isLightTheme ? "bg-slate-300/60" : "bg-white/10";
  const btnBorder = isLightTheme ? "border-slate-400" : "border-white/20";
  const btnHoverBg = isLightTheme
    ? "group-hover:bg-slate-300/80"
    : "group-hover:bg-white/20";
  const btnHoverBorder = isLightTheme
    ? "group-hover:border-slate-500"
    : "group-hover:border-white/40";
  const glowColor = isLightTheme
    ? "radial-gradient(circle at center, rgba(0, 0, 0, 0.1), transparent 70%)"
    : "radial-gradient(circle at center, rgba(255, 255, 255, 0.3), transparent 70%)";

  return (
    <button
      onClick={onClick}
      className={`
        group
        relative
        w-full
        ${bgCard}
        border ${borderCard}
        rounded-2xl 
        p-6 sm:p-8
        ${hoverBg}
        ${hoverBorder}
        active:scale-95
        transition-all 
        duration-300
        backdrop-blur-xl
        text-center
        space-y-3 sm:space-y-4
        touch-manipulation
        overflow-hidden
      `}
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
        <div className="text-4xl sm:text-6xl mb-2 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>

        {/* Title */}
        <h3
          className={`text-lg sm:text-xl font-bold uppercase tracking-wider ${textTitle}`}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          className={`text-xs sm:text-sm ${textDesc} ${textDescHover} transition-colors`}
        >
          {description}
        </p>

        {/* Call to action button */}
        <div
          className={`
          mt-3 sm:mt-4 
          px-4 sm:px-6 py-2 
          ${btnBg}
          border ${btnBorder}
          rounded-lg 
          ${btnHoverBg}
          ${btnHoverBorder}
          transition-all
          inline-block
          text-xs sm:text-sm
          font-medium
          tracking-wide
          ${textTitle}
        `}
        >
          Choose
        </div>
      </div>
    </button>
  );
};

export default ModeCard;
