import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { WebVoiceOnboardingSurface } from "./WebVoiceOnboardingSurface";

const source = readFileSync(
  "src/web/voice/WebVoiceOnboardingSurface.tsx",
  "utf8",
);
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
  it("renders the shared original VoiceHudSurface with navigation", () => {
    const html = renderToStaticMarkup(
      <WebVoiceOnboardingSurface
        mode="voice"
        userName="Maya"
        theme={{ primary: "PROFESSIONAL", hex: "#8be9fd" }}
        onBack={() => {}}
        onComplete={() => {}}
      />,
    );
    expect(html).toContain("Luca VoiceHUD original surface");
    expect(html).toContain("Back");
    expect(html).toContain("Enable microphone");
    expect(html).toContain("voice-hud-typed-fallback");
    expect(html).toContain("Hi Maya. I’m listening.");
    expect(html).toContain("Waiting for your voice…");
    expect(html).toContain(
      "Optional: tell Luca what you want help with first…",
    );
    expect(html).not.toContain("Text mode selected");
    expect(html).not.toContain("MICROPHONE UNAVAILABLE");
    expect(html).not.toContain("INPUT");
    expect(html).not.toContain("Voice Status:");
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
    expect(source).toContain("Preparing microphone access…");
    expect(source).toContain("Voice access is not available yet.");
    expect(source).toContain("Waiting for your voice…");
    expect(source).toContain(
      "You can type instead, or review microphone access.",
    );
    expect(source).toContain("I’m listening.");
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
