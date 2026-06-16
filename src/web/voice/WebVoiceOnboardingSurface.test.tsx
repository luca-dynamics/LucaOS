import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import { WebVoiceOnboardingSurface } from "./WebVoiceOnboardingSurface";

const source = readFileSync("src/web/voice/WebVoiceOnboardingSurface.tsx", "utf8");
const forbidden = ["../VoiceHud", "eventBus", "lucaService", "voiceSessionOrchestrator", "liveService", "soundService", "settingsService", "electron"];

describe("WebVoiceOnboardingSurface", () => {
  it("renders the shared VoiceHudPresentation with navigation", () => {
    const html = renderToStaticMarkup(
      <WebVoiceOnboardingSurface mode="voice" userName="Maya" theme={{ primary: "PROFESSIONAL", hex: "#8be9fd" }} onBack={() => {}} onComplete={() => {}} />,
    );
    expect(html).toContain("Luca VoiceHUD presentation");
    expect(html).toContain("Back / Change mode");
    expect(html).toContain("Enable microphone");
    expect(html).toContain("Typed fallback");
    expect(html).not.toContain("Text mode selected");
  });

  it("imports and renders VoiceHudPresentation instead of a standalone generated card", () => {
    expect(source).toContain("VoiceHudPresentation");
    expect(source).toContain("<VoiceHudPresentation");
    expect(source).not.toContain("LucaCanvasPresenceOrb");
    expect(source).not.toContain("rounded-2xl border p-4 text-left");
  });

  it("owns only browser-safe mic request and typed fallback state", () => {
    expect(source).toContain("navigator.mediaDevices.getUserMedia");
    expect(source).toContain("typedFallback");
    for (const item of forbidden) expect(source).not.toContain(item);
  });
});
