import { describe, expect, it } from "vitest";
import {
  isOnboardingFunctionalTailEmpty,
  resolveOnboardingFunctionalTail,
} from "./lucaOnboardingFunctionalTail";

describe("lucaOnboardingFunctionalTail", () => {
  it("is empty for the common Basic/cloud path with no camera", () => {
    const input = {
      intelligenceRoute: "luca_prime",
      supportsLocalProvisioning: true,
      cameraAvailable: false,
    };
    expect(resolveOnboardingFunctionalTail(input)).toEqual([]);
    expect(isOnboardingFunctionalTailEmpty(input)).toBe(true);
  });

  it("offers face recognition when a camera is available", () => {
    expect(
      resolveOnboardingFunctionalTail({
        intelligenceRoute: "luca_prime",
        supportsLocalProvisioning: true,
        cameraAvailable: true,
      }),
    ).toEqual(["face-recognition"]);
  });

  it("includes local setup only for a local route on a provisioning-capable host", () => {
    expect(
      resolveOnboardingFunctionalTail({
        intelligenceRoute: "local_model",
        supportsLocalProvisioning: true,
        cameraAvailable: false,
      }),
    ).toEqual(["local-intelligence-setup"]);
  });

  it("excludes local setup on hosts that cannot provision (web/Capacitor)", () => {
    expect(
      resolveOnboardingFunctionalTail({
        intelligenceRoute: "local_model",
        supportsLocalProvisioning: false,
        cameraAvailable: false,
      }),
    ).toEqual([]);
  });

  it("orders identity (face) before local infrastructure", () => {
    expect(
      resolveOnboardingFunctionalTail({
        intelligenceRoute: "local_model",
        supportsLocalProvisioning: true,
        cameraAvailable: true,
      }),
    ).toEqual(["face-recognition", "local-intelligence-setup"]);
  });

  it("can suppress the face-recognition offer explicitly", () => {
    expect(
      resolveOnboardingFunctionalTail({
        intelligenceRoute: "cloud_provider",
        supportsLocalProvisioning: true,
        cameraAvailable: true,
        offerFaceRecognition: false,
      }),
    ).toEqual([]);
  });

  it("treats an undefined camera as available (offer unless told otherwise)", () => {
    expect(
      resolveOnboardingFunctionalTail({
        intelligenceRoute: "byok",
        supportsLocalProvisioning: true,
      }),
    ).toEqual(["face-recognition"]);
  });
});
