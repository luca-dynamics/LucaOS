import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const source = readFileSync("src/components/Onboarding/OnboardingFlow.tsx", "utf8");
const webRuntimeSource = readFileSync("src/web/adapters/webOnboardingRuntime.tsx", "utf8");
const onboardingConversationSurfaceSource = readFileSync("src/components/Onboarding/OnboardingConversationSurface.tsx", "utf8");
const webVoiceSource = readFileSync("src/web/voice/WebVoiceOnboardingSurface.tsx", "utf8");
const voiceHudSource = readFileSync("src/components/voice/VoiceHudSurface.tsx", "utf8");
const themeSelectionSource = readFileSync("src/components/Onboarding/ThemeSelectionStep.tsx", "utf8");
const systemPanelsSource = readFileSync("src/components/Onboarding/OnboardingSystemPanels.tsx", "utf8");

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
    expect(webVoiceSource).toContain("VoiceHudSurface");
    expect(webVoiceSource).toContain("showTypedFallback");
    expect(voiceHudSource).toContain('aria-label="Luca VoiceHUD original surface"');
    expect(voiceHudSource).toContain("Enable microphone");
  });

  it("keeps mobile web onboarding focused and navigable", () => {
    expect(source).toContain('!(runtime.platform === "web" && step === "CONVERSATION")');
    expect(onboardingConversationSurfaceSource).toContain("Back / Change mode");
  });

  it("keeps skin selection framed as LucaOS environment personalization", () => {
    expect(themeSelectionSource).toContain("Choose Luca's environment");
    expect(themeSelectionSource).toContain("Pick the skin LucaOS will use across the app");
    expect(themeSelectionSource).toContain("Use this environment");
    expect(themeSelectionSource).toContain("selectedSkinId");
    expect(themeSelectionSource).not.toContain("Interface Calibration");
    expect(themeSelectionSource).not.toContain("Configure visual style");
  });

  it("keeps final readiness product-native and free of terminal copy", () => {
    expect(systemPanelsSource).toContain("Luca is ready");
    expect(systemPanelsSource).toContain("Your personal AI workspace is ready");
    expect(systemPanelsSource).toContain("LucaStaticFacePresence");
    expect(source).toContain('!["KERNEL_AWAKENING", "DIRECTIVE_ALIGNMENT", "COMPLETE"].includes(step)');
    expect(systemPanelsSource).not.toContain("System Ready");
    expect(systemPanelsSource).not.toContain("Connection Established");
    expect(source).not.toContain("PROTOCOL_CONNECTED");
  });

  it("explicitly avoids replaying preparation after WebBridge post-boot", () => {
    expect(webRuntimeSource).toContain("skipKernelAwakeningVisual: true");
    expect(source).toContain("runtime.skipKernelAwakeningVisual");
    expect(source).toContain("onboardingController.afterKernelAwakening()");
  });
});
