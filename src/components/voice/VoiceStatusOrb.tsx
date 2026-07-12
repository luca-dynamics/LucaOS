import React, { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [surfaceHeight, setSurfaceHeight] = useState(768);
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
        : "var(--luca-text-primary, var(--app-text-main, rgba(255,255,255,0.6)))";
  const presenceSize = Math.round(Math.min(112, Math.max(72, surfaceHeight * 0.16)));
  const verticalOffset = -Math.min(192, Math.max(58, surfaceHeight * 0.18));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measure = () => {
      const nextHeight = Math.max(1, Math.round(container.getBoundingClientRect().height));
      setSurfaceHeight((current) => (current === nextHeight ? current : nextHeight));
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div
        className="absolute z-20 flex flex-col items-center gap-2 sm:gap-3 pointer-events-none"
        style={{
          transform: `translateY(${verticalOffset}px)`,
        }}
      >
        <Presence
          intent={intent}
          color={canvasThemeColor}
          size={presenceSize}
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
