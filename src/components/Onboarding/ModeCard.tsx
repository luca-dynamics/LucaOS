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
        ${hoverBg}
        ${hoverBorder}
        active:scale-95
        transition-all 
        duration-300
        backdrop-blur-xl
        text-center
        touch-manipulation
        overflow-hidden
      `}
      style={{
        padding: "clamp(1rem, 5vmin, 2.5rem)",
        gap: "clamp(0.5rem, 2vmin, 1.25rem)",
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
          className="group-hover:scale-110 transition-transform duration-300"
          style={{ fontSize: "clamp(2rem, 10vmin, 5rem)", marginBottom: "2vmin" }}
        >
          {icon}
        </div>

        {/* Title */}
        <h3
          className={`font-bold uppercase tracking-wider ${textTitle}`}
          style={{ fontSize: "clamp(0.9rem, 3.5vmin, 1.4rem)" }}
        >
          {title}
        </h3>

        {/* Description */}
        <p
          className={`${textDesc} ${textDescHover} transition-colors`}
          style={{ fontSize: "clamp(0.5rem, 1.6vmin, 0.8rem)", marginTop: "1vmin" }}
        >
          {description}
        </p>

        {/* Call to action button */}
        <div
          className={`
          px-[3vmin] py-[1vmin] 
          ${btnBg}
          border ${btnBorder}
          rounded-[1vmin] 
          ${btnHoverBg}
          ${btnHoverBorder}
          transition-all
          inline-block
          font-medium
          tracking-wide
          ${textTitle}
        `}
          style={{ 
            marginTop: "2.5vmin",
            fontSize: "clamp(0.55rem, 1.6vmin, 0.8rem)"
          }}
        >
          Choose
        </div>
      </div>
    </button>
  );
};

export default ModeCard;
