import { useState } from "react";
import type { OnboardingConversationProps } from "../../components/Onboarding/OnboardingRuntimeAdapter";
import VoiceHudPresentation, { type VoiceHudPresentationState } from "../../components/voice/VoiceHudPresentation";

export function WebVoiceOnboardingSurface({
  userName,
  theme,
  onBack,
  onComplete,
}: OnboardingConversationProps) {
  const [microphoneStatus, setMicrophoneStatus] = useState<VoiceHudPresentationState>("idle");
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

  return (
    <VoiceHudPresentation
      state={microphoneStatus}
      title={userName ? `Hi ${userName}. Luca is listening.` : "Luca is listening."}
      subtitle={microphoneStatus === "unavailable" ? undefined : "Voice setup is available."}
      transcript={microphoneStatus === "ready" ? "Microphone ready" : undefined}
      micAvailable={microphoneStatus !== "unavailable"}
      themeColor={theme?.hex}
      compact
      showTypedFallback
      typedFallbackValue={typedFallback}
      typedFallbackPlaceholder="Optional: tell Luca what you want help with first…"
      onTypedFallbackChange={setTypedFallback}
      onRequestMic={requestMicrophone}
      onBack={onBack}
      onContinue={finish}
    />
  );
}
