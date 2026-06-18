import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import VoiceHudSurface from "./VoiceHudSurface";

const source = readFileSync("src/components/voice/VoiceHudSurface.tsx", "utf8");
const forbidden = ["electron", "window.electron", "window.luca", "eventBus", "lucaService", "toolRegistry", "voiceSessionOrchestrator", "liveService", "soundService", "settingsService", "personalityService", "awarenessService", "lucaLinkManager", "node:fs", "better-sqlite3"];

const baseProps = {
  isActive: true,
  isVisible: true,
  onClose: () => {},
  transcript: "hello",
  transcriptSource: "user" as const,
  isVadActive: true,
  isSpeaking: false,
  persona: "RUTHLESS",
  theme: { primary: "text-cyan-300", border: "border-cyan-300/40", bg: "bg-cyan-500/10", hex: "#67e8f9", themeName: "RUTHLESS" },
};

describe("VoiceHudSurface", () => {
  it("exists as the shared original VoiceHUD surface", () => {
    expect(source).toContain("export interface VoiceHudSurfaceProps");
    expect(source).toContain("data-voice-hud-surface=\"original\"");
  });

  it("uses original VoiceHUD structure and components", () => {
    expect(source).toContain("fixed inset-0 z-[200] flex flex-col items-center justify-center animate-in fade-in duration-500");
    expect(source).toContain("VoiceVisualizer");
    expect(source).toContain("VoiceStatusOrb");
    expect(source).toContain("VoiceControls");
    expect(source).toContain("ACTIVE PROTOCOLS");
    expect(source).toContain("TELEMETRY STREAM");
  });

  it("is not the generated PR voice card presentation", () => {
    expect(source).not.toContain("Luca VoiceHUD presentation");
    expect(source).not.toContain("LUCA VOICE");
    expect(source).not.toContain("Voice setup is available.");
    expect(source).not.toContain("rounded-3xl border px-5 py-4 text-center");
  });

  it("has no forbidden runtime imports", () => {
    for (const item of forbidden) expect(source).not.toContain(item);
  });

  it("renders original visualizer, orb, controls, transcript, and typed fallback areas", () => {
    const html = renderToStaticMarkup(<VoiceHudSurface {...baseProps} showTypedFallback onTypedFallbackChange={() => {}} />);
    expect(html).toContain("Luca VoiceHUD original surface");
    expect(html).toContain("WAITING FOR AUDIO INPUT...");
    expect(html).toContain("voice-hud-typed-fallback");
    expect(html).toContain("LOW_LATENCY");
  });
});
