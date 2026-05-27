import { createRealtimeVoiceSessionController } from "./createRealtimeVoiceSessionController";
import { createVoiceHudSubscriptionBridge } from "./createVoiceHudSubscriptionBridge";
import { createVoiceModeUiBridge } from "./createVoiceModeUiBridge";
import { createLiveVoiceRuntimeBridge } from "./createLiveVoiceRuntimeBridge";

const hud = createVoiceHudSubscriptionBridge();
const mode = createVoiceModeUiBridge();
const { controller } = createRealtimeVoiceSessionController({ hudBridge: hud.subscriptionBridge });
const liveRuntime = createLiveVoiceRuntimeBridge();

export const realtimeVoiceUiBridge = {
  controller,
  hudBridge: hud.subscriptionBridge,
  modeBridge: mode.bridge,
  liveRuntimeBridge: liveRuntime.bridge,
};

export type RealtimeVoiceUiBridge = typeof realtimeVoiceUiBridge;
