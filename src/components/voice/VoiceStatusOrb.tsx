import React from "react";
import { PersonaType } from "../../services/lucaService";
import { Presence, deriveIntentFromStatus } from "../presence";
import type { PresenceIntent } from "../presence";

interface VoiceStatusOrbProps {
  isVadActive: boolean;
  transcriptSource: "user" | "model";
  amplitude: number;
  persona: PersonaType;
  canvasThemeColor: string;
  isSpeaking?: boolean;
  statusMessage?: string | null;
  voiceModeLabel?: string;
  detailLabel?: string | null;
}

// Sentence-case, plain-language labels (Quiet Machine: no uppercase, no mono).
const INTENT_LABEL: Record<PresenceIntent, string> = {
  idle: "Ready",
  listening: "Listening",
  thinking: "Thinking",
  working: "Working",
  speaking: "Speaking",
  attention: "Needs attention",
  dormant: "Asleep",
};

const VoiceStatusOrb: React.FC<VoiceStatusOrbProps> = ({
  isVadActive,
  transcriptSource,
  amplitude,
  canvasThemeColor,
  isSpeaking = false,
  statusMessage,
  voiceModeLabel = "Voice",
  detailLabel,
}) => {
  const intent = deriveIntentFromStatus(statusMessage, {
    isVadActive,
    isSpeaking,
    transcriptSource,
    amplitude,
  });

  const labelColor =
    intent === "attention"
      ? "var(--app-danger, #f87171)"
      : intent !== "idle"
        ? "var(--app-id-accent, #ffffff)"
        : "var(--app-text-main, rgba(255,255,255,0.6))";

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className="absolute z-20 flex -translate-y-48 flex-col items-center gap-3 pointer-events-none">
        <Presence
          intent={intent}
          color={canvasThemeColor}
          size={132}
          reactToAudio
        />
        <div
          className="text-sm font-medium transition-colors duration-300"
          style={{ color: labelColor }}
        >
          {INTENT_LABEL[intent]}
        </div>
        <div
          className="text-[11px] opacity-70 transition-colors duration-300"
          style={{ color: labelColor }}
        >
          {voiceModeLabel}
        </div>
        {detailLabel ? (
          <div
            className="max-w-[240px] text-center text-[10px] opacity-55 transition-colors duration-300"
            style={{ color: labelColor }}
          >
            {detailLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VoiceStatusOrb;
