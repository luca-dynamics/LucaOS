import { VoiceOnboardingBridge } from "./VoiceOnboardingBridge";
import { VoiceOnboardingUiBridge } from "./VoiceOnboardingUiBridge";

export const createVoiceOnboardingUiBridge = (bridge = new VoiceOnboardingBridge()) => {
  const uiBridge = new VoiceOnboardingUiBridge(bridge);
  return {
    bridge: uiBridge,
    getState: uiBridge.getState.bind(uiBridge),
    subscribe: uiBridge.subscribe.bind(uiBridge),
    handleText: uiBridge.handleText.bind(uiBridge),
    handleTranscript: uiBridge.handleTranscript.bind(uiBridge),
    reset: uiBridge.reset.bind(uiBridge),
  };
};
