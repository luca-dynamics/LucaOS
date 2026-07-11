import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("BrowserHfRealtimeVoiceSession integration", () => {
  it("keeps realtime activation explicitly gated with fallback routing", () => {
    const orchestrator = readFileSync("src/services/voiceSessionOrchestrator.ts", "utf8");
    expect(orchestrator).toContain("settings.voice.hfRealtimeEnabled === true");
    expect(orchestrator).toContain("evaluateVoiceProviderReadiness");
    expect(orchestrator).toContain("evaluateVoiceRouteAuthority");
    expect(orchestrator).toContain("falling back to the configured hybrid pipeline");
    expect(orchestrator).toContain("await hybridVoiceService.connect");
  });

  it("exposes persisted endpoint controls in voice settings", () => {
    const settings = readFileSync("src/services/settingsService.ts", "utf8");
    const surface = readFileSync("src/components/settings/SettingsVoiceTab.tsx", "utf8");
    expect(settings).toContain("hfRealtimeEnabled?: boolean");
    expect(settings).toContain('hfRealtimeEndpoint: "ws://127.0.0.1:8765/v1/realtime"');
    expect(surface).toContain("OpenAI Realtime local backend");
    expect(surface).toContain('onUpdate("voice", "hfRealtimeEndpoint"');
  });
});
