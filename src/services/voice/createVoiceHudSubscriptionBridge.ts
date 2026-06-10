import { VoiceHudRuntimeBridge } from "./VoiceHudRuntimeBridge";
import { VoiceHudSubscriptionBridge } from "./VoiceHudSubscriptionBridge";

export const createVoiceHudSubscriptionBridge = (bridge = new VoiceHudRuntimeBridge()) => {
  const subscriptionBridge = new VoiceHudSubscriptionBridge(bridge);
  return {
    bridge: subscriptionBridge,
    subscriptionBridge,
    getState: subscriptionBridge.getState.bind(subscriptionBridge),
    subscribe: subscriptionBridge.subscribe.bind(subscriptionBridge),
    sendControl: subscriptionBridge.sendControl.bind(subscriptionBridge),
    updateTranscript: subscriptionBridge.updateTranscript.bind(subscriptionBridge),
    updateResponse: subscriptionBridge.updateResponse.bind(subscriptionBridge),
    updateCommand: subscriptionBridge.updateCommand.bind(subscriptionBridge),
    updateConfirmation: subscriptionBridge.updateConfirmation.bind(subscriptionBridge),
    updateError: subscriptionBridge.updateError.bind(subscriptionBridge),
    syncFromVoiceRuntimeState: subscriptionBridge.syncFromVoiceRuntimeState.bind(subscriptionBridge),
    reset: subscriptionBridge.reset.bind(subscriptionBridge),
  };
};
