import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const voiceHudSource = readFileSync("src/components/VoiceHud.tsx", "utf8");
const presentationSource = readFileSync("src/components/voice/VoiceHudPresentation.tsx", "utf8");

describe("VoiceHud desktop adapter", () => {
  it("imports and renders VoiceHudPresentation", () => {
    expect(voiceHudSource).toContain("VoiceHudPresentation");
    expect(voiceHudSource).toContain("<VoiceHudPresentation");
  });

  it("keeps desktop runtime/service imports in VoiceHud, not VoiceHudPresentation", () => {
    expect(voiceHudSource).toContain("../services/eventBus");
    expect(voiceHudSource).toContain("../services/voiceSessionOrchestrator");
    expect(presentationSource).not.toContain("eventBus");
    expect(presentationSource).not.toContain("voiceSessionOrchestrator");
  });

  it("maps existing voice states into VoiceHudPresentation props", () => {
    expect(voiceHudSource).toContain("presentationState");
    expect(voiceHudSource).toContain('"listening"');
    expect(voiceHudSource).toContain('"speaking"');
    expect(voiceHudSource).toContain('"thinking"');
    expect(voiceHudSource).toContain('state={presentationState}');
  });
});
