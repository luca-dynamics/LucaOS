import { describe, expect, it } from "vitest";
import { createVoiceOnboardingBridge } from "./createVoiceOnboardingBridge";

describe("createVoiceOnboardingBridge", () => {
  it("exposes expected onboarding factory surface", () => {
    const onboarding = createVoiceOnboardingBridge();
    expect(onboarding.bridge).toBeDefined();
    expect(typeof onboarding.handleTranscript).toBe("function");
    expect(typeof onboarding.handleText).toBe("function");
    expect(typeof onboarding.getState).toBe("function");
    expect(typeof onboarding.reset).toBe("function");
  });

  it("supports command handling and reset", () => {
    const onboarding = createVoiceOnboardingBridge();
    const result = onboarding.handleTranscript("my name is Dana");
    expect(result.status).toBe("handled");
    expect(onboarding.getState().currentStep).toBe("theme");

    onboarding.reset();
    expect(onboarding.getState().currentStep).toBe("name");
  });
});
