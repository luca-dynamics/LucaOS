import React from "react";
import ModeCard from "./ModeCard";
import { Icon } from "../ui/Icon";
import type { OnboardingModelReadiness } from "../../services/onboarding/OnboardingModelModeCoordinator";

export type ConversationMode = "text" | "voice";

interface ModeSelectProps {
  onSelect: (mode: ConversationMode) => void;
  isLightTheme: boolean;
  modelReadiness?: OnboardingModelReadiness | null;
  routeWarnings?: string[];
}

/**
 * Communication mode selection screen
 * Lets user choose between text or voice conversation
 * Theme-aware with support for light and dark modes
 */
const ModeSelect: React.FC<ModeSelectProps> = ({
  onSelect,
  isLightTheme,
  modelReadiness,
  routeWarnings = [],
}) => {
  return (
    <div className="animate-fade-in-up w-full max-w-2xl space-y-4 px-1 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:space-y-8 sm:px-0">
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
          className="mx-auto max-w-xl text-balance text-2xl font-bold tracking-wide sm:text-3xl"
          style={{ color: "var(--app-text-main)" }}
        >
          Choose how you want to talk
        </h1>
        <p
          className="text-xs sm:text-sm"
          style={{ color: "var(--app-text-muted)" }}
        >
          Let&apos;s get to know each other. Choose your preferred way to
          communicate.
        </p>
      </div>

      {modelReadiness && (
        <div
          className="rounded-xl border px-4 py-3 text-[10px] sm:text-xs space-y-2"
          style={{
            color: "var(--app-text-muted)",
            backgroundColor: "var(--app-bg-tint)",
            borderColor: routeWarnings.length
              ? "rgba(245, 158, 11, 0.45)"
              : "var(--app-border-main)",
          }}
        >
          <div
            className="flex items-center justify-between gap-3 uppercase tracking-[0.16em] font-bold"
            style={{ color: "var(--app-text-main)" }}
          >
            <span>Model route</span>
            <span>{modelReadiness.mode.replace("-", " ")}</span>
          </div>
          {routeWarnings.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 text-[var(--luca-warning,#f2b23e)]">
              {routeWarnings.slice(0, 3).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p>
              Chat route is selected. Voice readiness will be checked if you
              choose voice.
            </p>
          )}
        </div>
      )}

      {/* Mode cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <ModeCard
          iconName="ChatRoundDots"
          title="Text"
          description="Type your thoughts"
          onClick={() => onSelect("text")}
        />
        <ModeCard
          iconName="Microphone"
          title="Voice"
          description="Speak naturally"
          onClick={() => onSelect("voice")}
        />
      </div>

      <div
        className="rounded-lg border px-4 py-3 text-center text-xs font-medium transition-all duration-300"
        style={{
          color: "var(--app-text-main)",
          backgroundColor: "rgba(8, 9, 11, 0.72)",
          borderColor: "var(--app-border-main)",
        }}
      >
        You can switch between text and voice later.
      </div>
    </div>
  );
};

export default ModeSelect;
