import { describe, expect, it } from "vitest";
import {
  advanceOnboardingTail,
  createOnboardingTailState,
  currentOnboardingTailStep,
  getOnboardingTailProgress,
  isOnboardingTailComplete,
  isOnboardingTailEmpty,
} from "./lucaOnboardingTailController";

describe("lucaOnboardingTailController", () => {
  it("is empty and immediately complete for the Basic/cloud/no-camera path", () => {
    const state = createOnboardingTailState({
      intelligenceRoute: "luca_prime",
      supportsLocalProvisioning: true,
      cameraAvailable: false,
    });
    expect(isOnboardingTailEmpty(state)).toBe(true);
    expect(isOnboardingTailComplete(state)).toBe(true);
    expect(currentOnboardingTailStep(state)).toBeUndefined();
  });

  it("sequences face then local for a local route with a camera", () => {
    let state = createOnboardingTailState({
      intelligenceRoute: "local_model",
      supportsLocalProvisioning: true,
      cameraAvailable: true,
    });
    expect(state.steps).toEqual(["face-recognition", "local-intelligence-setup"]);
    expect(currentOnboardingTailStep(state)).toBe("face-recognition");

    state = advanceOnboardingTail(state);
    expect(currentOnboardingTailStep(state)).toBe("local-intelligence-setup");
    expect(isOnboardingTailComplete(state)).toBe(false);

    state = advanceOnboardingTail(state);
    expect(isOnboardingTailComplete(state)).toBe(true);
    expect(currentOnboardingTailStep(state)).toBeUndefined();
  });

  it("advance past the end is a no-op (same reference)", () => {
    const done = advanceOnboardingTail(
      createOnboardingTailState({
        intelligenceRoute: "luca_prime",
        supportsLocalProvisioning: true,
        cameraAvailable: false,
      }),
    );
    expect(advanceOnboardingTail(done)).toBe(done);
  });

  it("reports progress as index / total", () => {
    const state = createOnboardingTailState({
      intelligenceRoute: "local_model",
      supportsLocalProvisioning: true,
      cameraAvailable: true,
    });
    expect(getOnboardingTailProgress(state)).toEqual({ index: 0, total: 2, complete: false });
    expect(getOnboardingTailProgress(advanceOnboardingTail(advanceOnboardingTail(state)))).toEqual({
      index: 2,
      total: 2,
      complete: true,
    });
  });
});
