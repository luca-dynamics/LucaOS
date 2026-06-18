import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const voiceHudSource = readFileSync("src/components/VoiceHud.tsx", "utf8");
const surfaceSource = readFileSync("src/components/voice/VoiceHudSurface.tsx", "utf8");

const forbiddenSurfaceImports = ["electron", "window.electron", "window.luca", "eventBus", "lucaService", "toolRegistry", "voiceSessionOrchestrator", "liveService", "soundService", "settingsService", "personalityService", "awarenessService", "lucaLinkManager", "node:fs", "better-sqlite3"];

describe("VoiceHud desktop adapter", () => {
  it("imports and renders VoiceHudSurface", () => {
    expect(voiceHudSource).toContain("VoiceHudSurface");
    expect(voiceHudSource).toContain("<VoiceHudSurface");
  });

  it("keeps desktop runtime/service imports in VoiceHud, not VoiceHudSurface", () => {
    expect(voiceHudSource).toContain("../services/eventBus");
    expect(voiceHudSource).toContain("../services/voiceSessionOrchestrator");
    for (const item of forbiddenSurfaceImports) expect(surfaceSource).not.toContain(item);
  });

  it("maps existing voice runtime state into VoiceHudSurface props", () => {
    expect(voiceHudSource).toContain("amplitude={localAmplitude}");
    expect(voiceHudSource).toContain("telemetrySummary={telemetrySummary}");
    expect(voiceHudSource).toContain("dynamicProtocols={dynamicProtocols}");
    expect(voiceHudSource).toContain("runtimeRouteHealth={runtimeRouteHealth}");
  });

  it("no longer owns the duplicated original visual markup", () => {
    expect(voiceHudSource).not.toContain("<VoiceVisualizer");
    expect(voiceHudSource).not.toContain("<VoiceStatusOrb");
    expect(voiceHudSource).not.toContain("<VoiceControls");
    expect(surfaceSource).toContain("<VoiceVisualizer");
    expect(surfaceSource).toContain("<VoiceStatusOrb");
    expect(surfaceSource).toContain("<VoiceControls");
  });
});
