import { describe, expect, it, beforeEach } from "vitest";
import { CameraSentryBridge, type VisionFrame } from "./cameraSentryBridge";
import { credentialPoolService } from "./credentialPoolService";

describe("CameraSentryBridge", () => {
  let sentry: CameraSentryBridge;

  beforeEach(() => {
    sentry = new CameraSentryBridge();
    credentialPoolService.registerPool("gemini", [
      "FORCE_429_KEY",
      "HEALTHY_GEMINI_KEY_12345",
    ]);
  });

  it("analyzes camera vision frame successfully", async () => {
    const frame: VisionFrame = {
      frameId: "frame-001",
      imageBase64: "data:image/png;base64,mock",
      timestamp: Date.now(),
      source: "camera",
    };

    const result = await sentry.analyzeFrame(frame, "gemini", "HEALTHY_GEMINI_KEY_12345");
    expect(result.frameId).toBe("frame-001");
    expect(result.detectedObjects).toContain("user_face");
  });

  it("auto-rotates key on 429 rate limit error during vision frame analysis", async () => {
    const frame: VisionFrame = {
      frameId: "frame-002",
      imageBase64: "data:image/png;base64,mock",
      timestamp: Date.now(),
      source: "camera",
    };

    // First key FORCE_429_KEY triggers 429 error and auto-rotates to HEALTHY_GEMINI_KEY_12345
    const result = await sentry.analyzeFrame(frame, "gemini");
    expect(result.frameId).toBe("frame-002");
    expect(result.keyUsed).toBe("HEALTHY_...");
  });

  it("analyzes screen capture frame", async () => {
    const frame: VisionFrame = {
      frameId: "screen-001",
      imageBase64: "data:image/png;base64,mock",
      timestamp: Date.now(),
      source: "screen",
    };

    const result = await sentry.analyzeFrame(frame, "gemini", "HEALTHY_GEMINI_KEY_12345");
    expect(result.description).toContain("screen");
  });
});
