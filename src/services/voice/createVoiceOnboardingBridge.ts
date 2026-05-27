import { VoiceOnboardingBridge } from "./VoiceOnboardingBridge";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";

export function createVoiceOnboardingBridge(options?: { eventBridge?: VoiceRuntimeEventBridge; sessionId?: string }) {
  const bridge = new VoiceOnboardingBridge(options?.eventBridge, options?.sessionId);

  return {
    bridge,
    handleTranscript: (transcript: string, confidence?: number) => bridge.handleTranscript(transcript, confidence),
    handleText: (text: string, confidence?: number) => bridge.handleText(text, confidence),
    getState: () => bridge.getState(),
    reset: () => bridge.reset(),
  };
}
