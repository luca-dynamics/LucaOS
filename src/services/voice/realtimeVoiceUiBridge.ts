import { createRealtimeVoiceSessionController } from "./createRealtimeVoiceSessionController";
import { createVoiceHudSubscriptionBridge } from "./createVoiceHudSubscriptionBridge";
import { createVoiceModeUiBridge } from "./createVoiceModeUiBridge";

const hud = createVoiceHudSubscriptionBridge();
const mode = createVoiceModeUiBridge();
const { controller } = createRealtimeVoiceSessionController({ hudBridge: hud.subscriptionBridge });

export const realtimeVoiceUiBridge = {
  controller,
  hudBridge: hud.subscriptionBridge,
  modeBridge: mode.bridge,
};

export type RealtimeVoiceUiBridge = typeof realtimeVoiceUiBridge;
