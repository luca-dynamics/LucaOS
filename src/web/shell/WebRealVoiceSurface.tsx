import { useState } from "react";
import VoiceHudSurface from "../../components/voice/VoiceHudSurface";

type WebVoiceMicStatus = "idle" | "requesting" | "ready" | "unavailable";

const webVoiceTheme = {
  primary: "var(--luca-accent-primary)",
  border:
    "border-[color-mix(in_srgb,var(--luca-accent-primary)_32%,transparent)]",
  bg: "bg-[color-mix(in_srgb,var(--luca-accent-primary)_12%,transparent)]",
  glow: "shadow-[color:var(--luca-accent-primary)]",
  coreColor: "var(--luca-accent-primary)",
  hex: "var(--luca-accent-primary)",
  themeName: "web",
};

interface WebRealVoiceSurfaceProps {
  onClose: () => void;
}

export function WebRealVoiceSurface({ onClose }: WebRealVoiceSurfaceProps) {
  const [microphoneStatus, setMicrophoneStatus] =
    useState<WebVoiceMicStatus>("idle");
  const [typedFallback, setTypedFallback] = useState("");

  const requestMicrophone = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophoneStatus("unavailable");
      return;
    }

    setMicrophoneStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicrophoneStatus("ready");
    } catch {
      setMicrophoneStatus("unavailable");
    }
  };

  const isReady = microphoneStatus === "ready";
  const isRequesting = microphoneStatus === "requesting";
  const isUnavailable = microphoneStatus === "unavailable";

  return (
    <div data-luca-web-real-voice-surface>
      <VoiceHudSurface
        isActive
        isVisible
        onClose={onClose}
        onBack={onClose}
        onRequestMic={requestMicrophone}
        transcript={isReady ? "Voice is ready." : typedFallback}
        transcriptSource={isReady ? "system" : "user"}
        isVadActive={isReady || isRequesting}
        isSpeaking={false}
        persona="ASSISTANT"
        theme={webVoiceTheme}
        statusMessage={
          isUnavailable
            ? "Voice access is not available yet."
            : isRequesting
              ? "Preparing microphone access..."
              : isReady
                ? "Voice is ready."
                : "Waiting for your voice..."
        }
        hideDebugPanels
        hideControls
        transparentBackground
        amplitude={isReady ? 0.18 : isRequesting ? 0.12 : 0}
        micAvailable={!isUnavailable}
        realtimeStatus={microphoneStatus}
        realtimeLastError={
          isUnavailable
            ? "You can type instead, or review microphone access."
            : null
        }
        showTypedFallback
        typedFallbackValue={typedFallback}
        typedFallbackPlaceholder="Optional: tell Luca what you want help with first..."
        onTypedFallbackChange={setTypedFallback}
      />
    </div>
  );
}

export default WebRealVoiceSurface;
