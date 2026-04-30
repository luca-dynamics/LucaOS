import React from "react";
import { PersonaType } from "../../services/lucaService";

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

const VoiceStatusOrb: React.FC<VoiceStatusOrbProps> = ({
  isVadActive,
  transcriptSource,
  amplitude,
  isSpeaking = false,
  statusMessage,
  voiceModeLabel = "Voice",
  detailLabel,
}) => {
  const normalizedStatus = (statusMessage || "").toLowerCase();
  const isConnecting =
    normalizedStatus.includes("connecting") ||
    normalizedStatus.includes("starting");
  const isThinking =
    normalizedStatus.includes("thinking") ||
    normalizedStatus.includes("processing");
  const isWorking = normalizedStatus.includes("working");
  const hasError =
    normalizedStatus.includes("error") ||
    normalizedStatus.includes("problem") ||
    normalizedStatus.includes("failed");

  const primaryLabel = hasError
    ? "NEEDS ATTENTION"
    : isConnecting
      ? "CONNECTING"
      : isWorking
        ? "WORKING"
      : isThinking
        ? "THINKING"
        : isVadActive
          ? "LISTENING"
          : transcriptSource === "model" && (isSpeaking || amplitude > 0.05)
            ? "SPEAKING"
            : "READY";

  const isActiveState =
    isVadActive ||
    isSpeaking ||
    isConnecting ||
    isWorking ||
    isThinking ||
    hasError ||
    amplitude > 0.05;

  const labelColor = hasError
    ? "var(--app-danger, #f87171)"
    : isActiveState
      ? "var(--app-id-accent, #ffffff)"
      : "var(--app-text-main, rgba(255,255,255,0.5))";

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      {/* Center Status Text - Positioned exactly in the middle */}
      <div className="absolute z-20 flex -translate-y-48 flex-col items-center gap-2 pointer-events-none">
        <div
          className={`font-mono text-sm tracking-[0.5em] font-bold transition-all duration-300 ${
            isActiveState ? "text-white scale-110" : ""
          }`}
          style={{
            color: labelColor,
          }}
        >
          {primaryLabel}
        </div>
        <div
          className="font-mono text-[10px] tracking-[0.28em] uppercase opacity-70 transition-colors duration-300"
          style={{ color: labelColor }}
        >
          {voiceModeLabel}
        </div>
        {detailLabel ? (
          <div
            className="max-w-[240px] text-center font-mono text-[9px] tracking-[0.16em] uppercase opacity-55 transition-colors duration-300"
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
