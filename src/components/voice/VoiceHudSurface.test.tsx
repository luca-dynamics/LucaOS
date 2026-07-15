import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import VoiceHudSurface from "./VoiceHudSurface";

// Read the real source file, bypassing vite's `fs` -> node_polyfills mock
// alias (which returns an empty string and silently voids every assertion).
const { readFileSync } = process.getBuiltinModule("fs");

const source = readFileSync("src/components/voice/VoiceHudSurface.tsx", "utf8");
const forbidden = [
  "electron",
  "window.electron",
  "window.luca",
  "eventBus",
  "lucaService",
  "toolRegistry",
  "voiceSessionOrchestrator",
  "liveService",
  "soundService",
  "settingsService",
  "personalityService",
  "awarenessService",
  "lucaLinkManager",
  "node:fs",
  "better-sqlite3",
];
const tacticalCopy = [
  "ACTIVE PROTOCOLS",
  "TELEMETRY STREAM",
  "FIREWALL",
  "MISSION ACTIVE",
  "AUDIO_INPUT_DB",
  "DOMINANT_FREQ",
];

const baseProps = {
  isActive: true,
  isVisible: true,
  onClose: () => {},
  transcript: "",
  transcriptSource: "user" as const,
  isVadActive: true,
  isSpeaking: false,
  persona: "RUTHLESS",
  theme: {
    primary: "text-cyan-300",
    border: "border-cyan-300/40",
    bg: "bg-cyan-500/10",
    hex: "#67e8f9",
    themeName: "RUTHLESS",
  },
};

describe("VoiceHudSurface", () => {
  it("exists as the shared original VoiceHUD surface", () => {
    expect(source).toContain("export interface VoiceHudSurfaceProps");
    expect(source).toContain('data-voice-hud-surface="original"');
  });

  it("uses original VoiceHUD structure and components", () => {
    expect(source).toContain(
      "fixed inset-0 z-[200] flex flex-col items-center justify-center animate-in fade-in duration-500",
    );
    expect(source).toContain("VoiceVisualizer");
    expect(source).toContain("VoiceStatusOrb");
    expect(source).toContain("VoiceControls");
    expect(source).toContain('data-luca-material-role="root"');
    expect(source).toContain("lucaMaterialHudStyle");
  });

  it("gates technical panels behind explicit telemetry and tactical flags", () => {
    expect(source).toContain("enableVoiceTelemetryDebug");
    expect(source).toContain("VITE_LUCA_SHOW_VOICE_TELEMETRY");
    expect(source).toContain("isTacticalTelemetryMode ?? isTactical");
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

  it("normal render uses calm copy and hides tactical console wording", () => {
    const html = renderToStaticMarkup(
      <VoiceHudSurface
        {...baseProps}
        showTypedFallback
        onTypedFallbackChange={() => {}}
      />,
    );
    expect(html).toContain("Luca VoiceHUD original surface");
    expect(html).toContain("Listening");
    expect(html).toContain("Waiting for your voice…");
    expect(html).toContain("voice-hud-typed-fallback");
    expect(html).toContain("Ready");
    for (const copy of tacticalCopy) expect(html).not.toContain(copy);
    expect(html).not.toContain("INPUT");
    expect(html).not.toContain("WAITING FOR AUDIO INPUT");
    expect(html).not.toContain("MICROPHONE UNAVAILABLE");
    expect(html).not.toContain("Voice Status:");
  });

  it("technical panels only render when explicit debug telemetry is enabled", () => {
    const normalHtml = renderToStaticMarkup(
      <VoiceHudSurface {...baseProps} dynamicProtocols={["Calendar"]} />,
    );
    for (const copy of tacticalCopy) expect(normalHtml).not.toContain(copy);

    const debugHtml = renderToStaticMarkup(
      <VoiceHudSurface
        {...baseProps}
        enableVoiceTelemetryDebug
        isTacticalTelemetryMode
        dynamicProtocols={["Calendar"]}
      />,
    );
    expect(debugHtml).toContain("ACTIVE PROTOCOLS");
    expect(debugHtml).toContain("TELEMETRY STREAM");
    expect(debugHtml).toContain("AUDIO_INPUT_DB");
    expect(debugHtml).toContain("DOMINANT_FREQ");
  });
});
