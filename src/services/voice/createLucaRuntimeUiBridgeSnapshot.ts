import { ComputerUseConfirmationUiBridge } from "../computerUse/ComputerUseConfirmationUiBridge";
import { VoiceHudSubscriptionBridge } from "./VoiceHudSubscriptionBridge";
import { VoiceModeUiBridge } from "./VoiceModeUiBridge";
import { VoiceOnboardingUiBridge } from "./VoiceOnboardingUiBridge";

export const createLucaRuntimeUiBridgeSnapshot = (input: {
  voiceMode: VoiceModeUiBridge;
  voiceHud: VoiceHudSubscriptionBridge;
  onboarding: VoiceOnboardingUiBridge;
  computerUseConfirmation?: ComputerUseConfirmationUiBridge;
}) => ({
  voiceMode: input.voiceMode.getSnapshot(),
  voiceHud: input.voiceHud.getState(),
  onboarding: input.onboarding.getState(),
  computerUseConfirmation: input.computerUseConfirmation?.getState(),
  metadata: {
    snapshotKind: "luca_runtime_ui_bridge_snapshot_scaffold" as const,
    uiComponentsTouched: false as const,
    realProviderExecutionEnabled: false as const,
    realBrowserExecutionEnabled: false as const,
    systemApisCalled: false as const,
  },
});
