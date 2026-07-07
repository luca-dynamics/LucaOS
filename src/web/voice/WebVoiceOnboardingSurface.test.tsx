import { describe, expect, it } from "vitest";
import source from "./WebVoiceOnboardingSurface.tsx?raw";

const forbidden = [
  "../VoiceHud",
  "eventBus",
  "lucaService",
  "voiceSessionOrchestrator",
  "liveService",
  "soundService",
  "settingsService",
  "electron",
];

describe("WebVoiceOnboardingSurface", () => {
  it("renders the shared original VoiceHudSurface with navigation props", () => {
    expect(source).toContain("<VoiceHudSurface");
    expect(source).toContain("onClose={onBack || (() => {})}");
    expect(source).toContain("onBack={onBack}");
    expect(source).toContain("onContinue={finish}");
    expect(source).toContain("onRequestMic={requestMicrophone}");
    expect(source).toContain("showTypedFallback");
    expect(source).toContain("hideDebugPanels");
    expect(source).toContain("hideControls");
    expect(source).not.toContain("Text mode selected");
    expect(source).not.toContain("MICROPHONE UNAVAILABLE");
    expect(source).not.toContain("INPUT");
    expect(source).not.toContain("Voice Status:");
  });

  it("imports and renders VoiceHudSurface instead of a standalone generated card", () => {
    expect(source).toContain("VoiceHudSurface");
    expect(source).toContain("<VoiceHudSurface");
    expect(source).not.toContain("LucaCanvasPresenceOrb");
    expect(source).not.toContain("rounded-3xl border px-5 py-4 text-center");
    expect(source).not.toContain("Luca VoiceHUD presentation");
    expect(source).not.toContain("LUCA VOICE");
    expect(source).not.toContain("Voice setup is available.");
  });

  it("uses product-native onboarding copy without WebBridge or tactical wording", () => {
    expect(source).toContain("Voice is ready.");
    expect(source).toContain("Preparing microphone access");
    expect(source).toContain("Voice access is not available yet.");
    expect(source).toContain("Waiting for your voice");
    expect(source).toContain(
      "You can type instead, or review microphone access.",
    );
    expect(source).toContain("listening");
    expect(source).not.toContain("Microphone unavailable");
    expect(source).not.toContain("Waiting for audio input");
    expect(source).not.toContain("Use typed fallback");
    expect(source).not.toContain("WebBridge");
    expect(source).not.toContain("browser-safe");
    expect(source).not.toContain("runtime wording");
  });

  it("owns only browser-safe mic request and typed fallback state", () => {
    expect(source).toContain("navigator.mediaDevices.getUserMedia");
    expect(source).toContain("typedFallback");
    for (const item of forbidden) expect(source).not.toContain(item);
  });
});
