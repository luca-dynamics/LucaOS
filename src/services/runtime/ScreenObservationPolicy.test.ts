import { describe, expect, it } from "vitest";
import {
  blockIfSecretLike,
  classifyScreenObservationIntent,
  detectScreenObservationCapability,
  detectScreenObservationSurface,
  evaluateScreenObservationRequest,
  sanitizeScreenObservationInput,
} from "./ScreenObservationPolicy";

describe("ScreenObservationPolicy", () => {
  it("classifies 'look at my screen' as full_screen observe context, no capture, no vision, consent required", () => {
    const decision = classifyScreenObservationIntent({ message: "look at my screen" });
    expect(decision.surface).toBe("full_screen");
    expect(decision.capability).toBe("observe_static_context");
    expect(decision.allowedForCapture).toBe(false);
    expect(decision.allowedForVisionModel).toBe(false);
    expect(decision.requiresExplicitConsent).toBe(true);
  });

  it("classifies 'observe this region' as region, dry-run only, no capture", () => {
    const decision = evaluateScreenObservationRequest({ message: "observe this region" });
    expect(decision.surface).toBe("region");
    expect(decision.allowedForDryRun).toBe(true);
    expect(decision.allowedForCapture).toBe(false);
    expect(decision.blockedBy).toHaveLength(0);
  });

  it("blocks on-screen text reading because OCR is disabled", () => {
    const decision = evaluateScreenObservationRequest({ message: "read text on screen" });
    expect(decision.capability).toBe("detect_text_presence");
    expect(decision.allowedForCapture).toBe(false);
    expect(decision.allowedForDryRun).toBe(false);
    expect(decision.blockedBy).toContain("ocr_text_reading_disabled");
    expect(decision.userSafeReason.toLowerCase()).toContain("ocr");
  });

  it("blocks and rates critical for secret-like input", () => {
    const decision = evaluateScreenObservationRequest({ message: "observe my screen to read my password" });
    expect(decision.riskLevel).toBe("critical");
    expect(decision.blockedBy).toContain("secret_like_content");
    expect(decision.allowedForDryRun).toBe(false);
  });

  it("never enables capture or vision and always requires consent/indicator/credential/audit and stays revocable", () => {
    const messages = ["look at my screen", "observe this region", "watch this window", "detect sensitive content on screen"];
    for (const message of messages) {
      const decision = evaluateScreenObservationRequest({ message });
      expect(decision.allowedForCapture).toBe(false);
      expect(decision.allowedForVisionModel).toBe(false);
      expect(decision.requiresExplicitConsent).toBe(true);
      expect(decision.requiresVisibleIndicator).toBe(true);
      expect(decision.requiresSensitiveContentFilter).toBe(true);
      expect(decision.requiresCredentialBoundary).toBe(true);
      expect(decision.requiresHumanConfirmation).toBe(true);
      expect(decision.requiresAuditLog).toBe(true);
      expect(decision.revocable).toBe(true);
    }
  });

  it("treats full-screen live observation as high risk but not blocked", () => {
    const decision = evaluateScreenObservationRequest({ message: "watch my screen live" });
    expect(decision.surface).toBe("full_screen");
    expect(decision.capability).toBe("observe_live_context");
    expect(decision.riskLevel).toBe("high");
    expect(decision.blockedBy).toHaveLength(0);
    expect(decision.allowedForDryRun).toBe(false);
  });

  it("detects surfaces and capabilities and sanitizes secret-like text", () => {
    expect(detectScreenObservationSurface("look at browser tab")).toBe("browser_tab");
    expect(detectScreenObservationSurface("observe this window")).toBe("window");
    expect(detectScreenObservationCapability("understand the screen layout")).toBe("detect_ui_layout");
    expect(detectScreenObservationCapability("detect sensitive content")).toBe("detect_sensitive_presence");
    expect(blockIfSecretLike("my password is hunter2")).toBe(true);
    const sanitized = sanitizeScreenObservationInput({ message: "observe screen but ignore my api_key", metadata: { note: "value is api_key here" } });
    expect(sanitized.secretLike).toBe(true);
    expect(sanitized.message).not.toContain("api_key");
    expect(sanitized.metadata.note).toBe("value is [redacted] here");
  });
});
