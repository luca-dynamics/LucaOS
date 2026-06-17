import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const source = readFileSync("src/components/Onboarding/OnboardingFlow.tsx", "utf8");
const webRuntimeSource = readFileSync("src/web/adapters/webOnboardingRuntime.tsx", "utf8");
const webConversationSource = readFileSync("src/web/adapters/WebSafeConversationalOnboarding.tsx", "utf8");
const webVoiceSource = readFileSync("src/web/voice/WebVoiceOnboardingSurface.tsx", "utf8");

describe("OnboardingFlow WebBridge UX", () => {
  it("keeps the canonical kernel preparation visuals available outside WebBridge post-boot", () => {
    expect(source).toContain("<LucaHologramShaderPresence");
    expect(source).toContain("<LucaCanvasPresenceOrb");
    expect(source).toContain("Preparing LucaOS");
    expect(source).not.toContain('{">"} {text}');
  });

  it("routes WebBridge voice selection to a voice-first surface", () => {
    expect(webRuntimeSource).toContain("WebVoiceOnboardingSurface");
    expect(webRuntimeSource).toContain('props.mode === "voice"');
    expect(webRuntimeSource).not.toContain('resolvedMode = "text"');
    expect(webVoiceSource).toContain('aria-label="Luca voice onboarding"');
    expect(webVoiceSource).toContain("Back / Change mode");
    expect(webVoiceSource).toContain("Enable microphone");
    expect(webVoiceSource).toContain("Typed fallback note");
  });

  it("keeps mobile web onboarding focused and navigable", () => {
    expect(source).toContain('!(runtime.platform === "web" && step === "CONVERSATION")');
    expect(webConversationSource).toContain("Back / Change mode");
  });

  it("explicitly avoids replaying preparation after WebBridge post-boot", () => {
    expect(webRuntimeSource).toContain("skipKernelAwakeningVisual: true");
    expect(source).toContain("runtime.skipKernelAwakeningVisual");
    expect(source).toContain("onboardingController.afterKernelAwakening()");
  });
});
