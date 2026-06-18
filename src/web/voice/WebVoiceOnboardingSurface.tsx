import { useState } from "react";
import type { OnboardingConversationProps } from "../../components/Onboarding/OnboardingRuntimeAdapter";
import VoiceHudSurface from "../../components/voice/VoiceHudSurface";

type WebVoiceMicStatus = "idle" | "requesting" | "ready" | "unavailable";

export function WebVoiceOnboardingSurface({
  userName,
  theme,
  onBack,
  onComplete,
}: OnboardingConversationProps) {
  const [microphoneStatus, setMicrophoneStatus] = useState<WebVoiceMicStatus>("idle");
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

  const finish = () =>
    onComplete({
      identity: { name: userName },
      assistantPreferences: { detailLevel: "balanced", helpStyle: "proactive" },
      personality: { preferences: ["voice-first", typedFallback || "balanced setup"] },
      workContext: { profession: typedFallback },
    });

  const isReady = microphoneStatus === "ready";
  const isRequesting = microphoneStatus === "requesting";
  const isUnavailable = microphoneStatus === "unavailable";

  return (
    <VoiceHudSurface
      isActive
      isVisible
      onClose={onBack || (() => {})}
      onBack={onBack}
      onContinue={finish}
      onRequestMic={requestMicrophone}
      transcript={isReady ? "Microphone ready" : userName ? `Hi ${userName}. Luca is listening.` : ""}
      transcriptSource={isReady ? "system" : "user"}
      isVadActive={isReady || isRequesting}
      isSpeaking={false}
      persona={theme?.primary || "RUTHLESS"}
      theme={{
        primary: theme?.hex || "#67e8f9",
        border: "border-cyan-300/40",
        bg: "bg-cyan-500/10",
        glow: "shadow-cyan-500/30",
        coreColor: theme?.hex || "#67e8f9",
        hex: theme?.hex || "#67e8f9",
        themeName: theme?.primary || "web",
      }}
      statusMessage={isUnavailable ? "Microphone unavailable" : isRequesting ? "Requesting microphone" : isReady ? "Microphone ready" : "Waiting for audio input"}
      hideDebugPanels
      hideControls
      transparentBackground
      amplitude={isReady ? 0.18 : isRequesting ? 0.12 : 0}
      micAvailable={!isUnavailable}
      realtimeStatus={microphoneStatus}
      realtimeLastError={isUnavailable ? "Use typed fallback or check browser microphone permission." : null}
      showTypedFallback
      typedFallbackValue={typedFallback}
      typedFallbackPlaceholder="Optional: tell Luca what you want help with first…"
      onTypedFallbackChange={setTypedFallback}
    />
  );
}
