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
  return (
    <div className="space-y-4 sm:space-y-8 animate-fade-in-up w-full max-w-2xl px-4 sm:px-0">
      {/* Luca's message */}
      <div className="text-center space-y-2 sm:space-y-3">
        {/* Icon - Hidden on mobile for more compact view */}
        <div className="hidden sm:flex justify-center mb-4">
          <div
            className="w-16 h-16 rounded-full border glass-blur flex items-center justify-center transition-all"
            style={{
              borderColor: "var(--app-border-main)",
              backgroundColor: "var(--app-bg-tint)",
            }}
          >
            <Icon
              name="ChatRoundDots"
              variant="Linear"
              className="w-8 h-8"
              style={{ color: "var(--app-text-main)" }}
            />
          </div>
        </div>
        <h1
          className="text-xl sm:text-2xl font-bold tracking-widest uppercase"
          style={{ color: "var(--app-text-main)" }}
        >
          How would you like to talk?
        </h1>
        <p
          className="text-xs sm:text-sm"
          style={{ color: "var(--app-text-muted)" }}
        >
          Let&apos;s get to know each other. Choose your preferred way to
          communicate.
        </p>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
        className="text-center text-xs rounded-lg px-4 py-2 glass-blur border transition-all duration-300"
        style={{
          color: "var(--app-text-muted)",
          backgroundColor: "var(--app-bg-tint)",
          borderColor: "var(--app-border-main)",
        }}
      >
        You can switch between text and voice anytime during our conversation
      </div>
    </div>
  );
};

export default ModeSelect;
