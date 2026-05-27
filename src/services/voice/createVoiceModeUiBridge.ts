import { VoiceModeRuntimeLike, VoiceModeUiBridge } from "./VoiceModeUiBridge";

export const createVoiceModeUiBridge = (runtime?: VoiceModeRuntimeLike) => {
  const bridge = new VoiceModeUiBridge(runtime);
  return {
    bridge,
    getState: bridge.getState.bind(bridge),
    getSnapshot: bridge.getSnapshot.bind(bridge),
    subscribe: bridge.subscribe.bind(bridge),
    unsubscribe: bridge.unsubscribe.bind(bridge),
    setMode: bridge.setMode.bind(bridge),
    startVoiceSession: bridge.startVoiceSession.bind(bridge),
    stopVoiceSession: bridge.stopVoiceSession.bind(bridge),
    handleTextInput: bridge.handleTextInput.bind(bridge),
    handleTranscript: bridge.handleTranscript.bind(bridge),
    reset: bridge.reset.bind(bridge),
  };
};
