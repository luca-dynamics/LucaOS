import { describe, expect, it } from "vitest";
import { VoiceOnboardingBridge } from "./VoiceOnboardingBridge";
import { VoiceOnboardingUiBridge } from "./VoiceOnboardingUiBridge";

describe("VoiceOnboardingUiBridge", () => {
  it("advances onboarding via text/transcript", () => {
    const bridge = new VoiceOnboardingUiBridge(new VoiceOnboardingBridge());
    bridge.handleText("My name is Alex");
    expect(bridge.getState().currentStep).toBe("theme");
    bridge.handleTranscript("dark");
    expect(bridge.getState().currentStep).toBe("background_opacity");
    expect(bridge.getState().metadata.uiComponentsTouched).toBe(false);
  });
});
