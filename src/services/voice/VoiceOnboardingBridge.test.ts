import { describe, expect, it } from "vitest";
import { VoiceOnboardingBridge } from "./VoiceOnboardingBridge";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";
import { VoiceInMemoryTapeSink } from "./VoiceInMemoryTapeSink";

describe("VoiceOnboardingBridge", () => {
  it("starts at name step", () => {
    const bridge = new VoiceOnboardingBridge();
    expect(bridge.getState().currentStep).toBe("name");
  });

  it("handles name via transcript and text", () => {
    const bridge = new VoiceOnboardingBridge();
    expect(bridge.handleTranscript("my name is Alex").status).toBe("handled");
    expect(bridge.getState().userName).toBe("alex");

    bridge.reset();
    expect(bridge.handleText("Jordan").status).toBe("handled");
    expect(bridge.getState().userName).toBe("Jordan");
  });

  it("handles theme, opacity, and all model mode paths", () => {
    const bridge = new VoiceOnboardingBridge();
    bridge.handleText("Taylor");
    expect(bridge.handleText("dark").status).toBe("handled");
    expect(bridge.getState().theme).toBe("dark");

    bridge.handleText("high");
    expect(bridge.getState().backgroundOpacity).toBe(85);

    bridge.handleText("Luca Prime");
    expect(bridge.getState().modelMode).toBe("luca_prime");

    bridge.reset();
    bridge.handleText("Taylor");
    bridge.handleText("light");
    bridge.handleText("35");
    bridge.handleText("local models");
    expect(bridge.getState().currentStep).toBe("local_model_scan");

    bridge.reset();
    bridge.handleText("Taylor");
    bridge.handleText("system");
    bridge.handleText("50");
    bridge.handleText("BYOK");
    expect(bridge.getState().modelMode).toBe("byok");
  });

  it("handles local model scan as scaffold-only and preferences completion", () => {
    const bridge = new VoiceOnboardingBridge();
    bridge.handleText("Sam");
    bridge.handleText("dark");
    bridge.handleText("20");
    bridge.handleText("local models");
    const scan = bridge.handleText("yes scan");
    expect(scan.status).toBe("handled");
    expect(bridge.getState().localModelScanRequested).toBe(true);

    const done = bridge.handleText("prefer keyboard shortcuts");
    expect(done.status).toBe("complete");
    expect(bridge.getState().completed).toBe(true);
  });

  it("returns needs_clarification for ambiguous input", () => {
    const bridge = new VoiceOnboardingBridge();
    bridge.handleText("Avery");
    const result = bridge.handleText("maybe");
    expect(result.status).toBe("needs_clarification");
  });

  it("records onboarding results and tolerates recording failures", () => {
    const sink = new VoiceInMemoryTapeSink();
    const eventBridge = new VoiceRuntimeEventBridge(sink);
    const bridge = new VoiceOnboardingBridge(eventBridge, "onboarding-1");

    bridge.handleText("Chris");
    expect(sink.getSnapshot("onboarding-1").totalRecords).toBeGreaterThan(0);

    const failingBridge = new VoiceOnboardingBridge({
      recordCommandResult: () => {
        throw new Error("boom");
      },
    } as unknown as VoiceRuntimeEventBridge);

    expect(() => failingBridge.handleText("Chris")).not.toThrow();
  });

  it("keeps scaffold metadata and resets to initial state", () => {
    const bridge = new VoiceOnboardingBridge();
    bridge.handleText("Casey");
    bridge.handleText("dark");
    const response = bridge.handleText("high");
    expect(response.metadata.audioApisCalled).toBe(false);
    expect(response.metadata.sttApisCalled).toBe(false);
    expect(response.metadata.ttsApisCalled).toBe(false);
    expect(response.metadata.systemApisCalled).toBe(false);
    expect(response.metadata.heavyModelsLoaded).toBe(false);

    bridge.reset();
    expect(bridge.getState().currentStep).toBe("name");
    expect(bridge.getState().completed).toBe(false);
  });
});
