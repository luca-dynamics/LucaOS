import { describe, expect, it } from "vitest";
import { ComputerUseConfirmationUiBridge } from "../computerUse/ComputerUseConfirmationUiBridge";
import { ComputerUseGuardConfirmationBridge } from "../computerUse/ComputerUseGuardConfirmationBridge";
import { createLucaRuntimeUiBridgeSnapshot } from "./createLucaRuntimeUiBridgeSnapshot";
import { VoiceHudSubscriptionBridge } from "./VoiceHudSubscriptionBridge";
import { VoiceHudRuntimeBridge } from "./VoiceHudRuntimeBridge";
import { VoiceModeUiBridge } from "./VoiceModeUiBridge";
import { VoiceOnboardingBridge } from "./VoiceOnboardingBridge";
import { VoiceOnboardingUiBridge } from "./VoiceOnboardingUiBridge";

describe("createLucaRuntimeUiBridgeSnapshot", () => {
  it("includes all bridge states and scaffold metadata", () => {
    const snapshot = createLucaRuntimeUiBridgeSnapshot({
      voiceMode: new VoiceModeUiBridge(),
      voiceHud: new VoiceHudSubscriptionBridge(new VoiceHudRuntimeBridge()),
      onboarding: new VoiceOnboardingUiBridge(new VoiceOnboardingBridge()),
      computerUseConfirmation: new ComputerUseConfirmationUiBridge(new ComputerUseGuardConfirmationBridge()),
    });
    expect(snapshot.voiceMode.metadata.providerApisCalled).toBe(false);
    expect(snapshot.metadata.realBrowserExecutionEnabled).toBe(false);
  });
});
