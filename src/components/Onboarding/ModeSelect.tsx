import React from "react";
import ModeCard from "./ModeCard";
import { Icon } from "../ui/Icon";

export type ConversationMode = "text" | "voice";

interface ModeSelectProps {
  onSelect: (mode: ConversationMode) => void;
  isLightTheme: boolean;
}

/**
 * Communication mode selection screen
 * Lets user choose between text or voice conversation
 * Theme-aware with support for light and dark modes
 */
const ModeSelect: React.FC<ModeSelectProps> = ({ onSelect, isLightTheme }) => {
  const iconColor = "var(--app-text-main)";

  return (
    <div
      className="animate-fade-in-up w-full flex flex-col items-center"
      style={{ gap: "4vmin" }}
    >
      {/* Luca's message */}
      <div
        className="text-center flex flex-col items-center"
        style={{ gap: "2vmin" }}
      >
        {/* Icon - Hidden on mobile for more compact view */}
        <div className="hidden sm:flex justify-center">
          <div
            className="rounded-full border glass-blur flex items-center justify-center transition-all"
            style={{
              width: "clamp(3rem, 10vmin, 4.5rem)",
              height: "clamp(3rem, 10vmin, 4.5rem)",
              borderColor: "var(--app-border-main)",
              backgroundColor: "var(--app-bg-tint)",
            }}
          >
            <Icon
              name="ChatRoundDots"
              variant="Linear"
              style={{
                width: "clamp(1.5rem, 5vmin, 2.25rem)",
                height: "clamp(1.5rem, 5vmin, 2.25rem)",
                color: iconColor,
              }}
            />
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: "1.5vmin" }}>
          <h1
            className="font-bold tracking-widest uppercase transition-colors"
            style={{
              fontSize: "clamp(1rem, 4.5vmin, 1.8rem)",
              color: "var(--app-text-main)",
            }}
          >
            How would you like to talk to LUCA?
          </h1>
          <p
            className="transition-colors opacity-80"
            style={{
              fontSize: "clamp(0.6rem, 2.2vmin, 0.9rem)",
              color: "var(--app-text-muted)",
            }}
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
          iconName="ChatRoundDots"
          title="TEXT"
          description="Type your thoughts"
          onClick={() => onSelect("text")}
        />
        <ModeCard
          iconName="Microphone"
          title="VOICE"
          description="Speak naturally"
          onClick={() => onSelect("voice")}
        />
      </div>

      <div
        className="text-center rounded-[1.5vmin] glass-blur max-w-lg mx-auto flex items-center justify-center transition-all duration-300"
        style={{
          padding: "1.5vmin 3vmin",
          fontSize: "clamp(0.5rem, 1.5vmin, 0.75rem)",
          gap: "1vmin",
          color: "var(--app-text-muted)",
          backgroundColor: "var(--app-bg-tint)",
          border: "1px solid var(--app-border-main)",
        }}
      >
        <Icon
          name="Lightbulb"
          size={12}
          style={{ color: iconColor }}
          variant="Linear"
        />
        <span>
          You can switch between text and voice anytime during our conversation
        </span>
      </div>
    </div>
  );
};

export default ModeSelect;
