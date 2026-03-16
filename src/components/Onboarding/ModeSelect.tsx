import React from "react";
import ModeCard from "./ModeCard";
import { MessageCircle } from "lucide-react";

export type ConversationMode = "text" | "voice";

interface ModeSelectProps {
  onSelect: (mode: ConversationMode) => void;
  isLightTheme?: boolean;
}

/**
 * Communication mode selection screen
 * Lets user choose between text or voice conversation
 * Theme-aware with support for light and dark modes
 */
const ModeSelect: React.FC<ModeSelectProps> = ({
  onSelect,
  isLightTheme = false,
}) => {
  // Theme-aware colors
  const textHeading = isLightTheme ? "text-slate-900" : "text-white";
  const textMuted = isLightTheme ? "text-slate-700" : "text-white/60";
  const bgIcon = isLightTheme ? "bg-slate-200" : "bg-white/10";
  const borderIcon = isLightTheme ? "border-slate-300" : "border-white/20";
  const iconColor = isLightTheme ? "text-slate-700" : "text-white";
  const bgHelper = isLightTheme ? "bg-slate-200/60" : "bg-white/5";
  const borderHelper = isLightTheme ? "border-slate-300" : "border-white/10";

  return (
    <div className="animate-fade-in-up w-full flex flex-col items-center" style={{ gap: "4vmin" }}>
      {/* Luca's message */}
      <div className="text-center flex flex-col items-center" style={{ gap: "2vmin" }}>
        {/* Icon - Hidden on mobile for more compact view */}
        <div className="hidden sm:flex justify-center">
          <div
            className={`
            rounded-full 
            ${bgIcon}
            border ${borderIcon}
            backdrop-blur-xl
            flex items-center justify-center
          `}
            style={{
              width: "clamp(3rem, 10vmin, 4.5rem)",
              height: "clamp(3rem, 10vmin, 4.5rem)",
            }}
          >
            <MessageCircle 
              className={iconColor}
              style={{
                width: "clamp(1.5rem, 5vmin, 2.25rem)",
                height: "clamp(1.5rem, 5vmin, 2.25rem)",
              }}
            />
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: "1.5vmin" }}>
          <h1
            className={`font-bold tracking-widest uppercase ${textHeading}`}
            style={{ fontSize: "clamp(1rem, 4.5vmin, 1.8rem)" }}
          >
            How would you like to talk?
          </h1>
          <p 
            className={textMuted}
            style={{ fontSize: "clamp(0.6rem, 2.2vmin, 0.9rem)" }}
          >
            Let&apos;s get to know each other. Choose your preferred way to
            communicate.
          </p>
        </div>
      </div>

      {/* Mode cards */}
      <div 
        className="grid grid-cols-1 sm:grid-cols-2 w-full max-w-2xl mx-auto" 
        style={{ gap: "clamp(1rem, 4vmin, 3rem)" }}
      >
        <ModeCard
            icon="💬"
            title="TEXT"
            description="Type your thoughts"
            onClick={() => onSelect("text")}
            isLightTheme={isLightTheme}
          />
          <ModeCard
            icon="🎙️"
            title="VOICE"
            description="Speak naturally"
            onClick={() => onSelect("voice")}
            isLightTheme={isLightTheme}
          />
      </div>

      <div
        className={`
        text-center 
        ${textMuted}
        ${bgHelper}
        border ${borderHelper}
        rounded-[1.5vmin] 
        backdrop-blur-xl
        max-w-lg
        mx-auto
      `}
        style={{ 
          padding: "1.5vmin 3vmin",
          fontSize: "clamp(0.5rem, 1.5vmin, 0.75rem)"
        }}
      >
        💡 You can switch between text and voice anytime during our conversation
      </div>
    </div>
  );
};

export default ModeSelect;
