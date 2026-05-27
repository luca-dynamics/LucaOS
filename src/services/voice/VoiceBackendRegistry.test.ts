import { describe, expect, it } from "vitest";
import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { LucaSTTBackend, LucaTTSBackend } from "./types";

function makeSTT(id: string, providerKind: "local" | "cloud" | "byok"): LucaSTTBackend {
  return {
    id,
    label: `${id}-label`,
    providerKind,
    supportsStreaming: true,
    supportedLanguages: ["en"],
    transcribe: async () => ({ transcript: "ok", language: "en", confidence: 0.99, isFinal: true }),
    getSnapshot: () => ({
      id,
      label: `${id}-label`,
      providerKind,
      supportsStreaming: true,
      supportedLanguages: ["en"],
    }),
  };
}

function makeTTS(id: string, providerKind: "local" | "cloud" | "byok"): LucaTTSBackend {
  return {
    id,
    label: `${id}-label`,
    providerKind,
    supportsStreaming: false,
    supportsVoiceClone: false,
    supportsEmotion: false,
    supportedLanguages: ["en"],
    synthesize: async () => ({ outputEvent: { kind: "tts_completed", text: "done" } }),
    getSnapshot: () => ({
      id,
      label: `${id}-label`,
      providerKind,
      supportsStreaming: false,
      supportsVoiceClone: false,
      supportsEmotion: false,
      supportedLanguages: ["en"],
    }),
  };
}

describe("VoiceBackendRegistry", () => {
  it("registers, lists and selects STT/TTS backends", () => {
    const registry = new VoiceBackendRegistry();
    const sttLocal = makeSTT("stt-local", "local");
    const ttsCloud = makeTTS("tts-cloud", "cloud");

    registry.registerSTTBackend(sttLocal);
    registry.registerTTSBackend(ttsCloud);

    expect(registry.listSTTBackends()).toHaveLength(1);
    expect(registry.listTTSBackends()).toHaveLength(1);
    expect(registry.selectSTTBackend({ id: "stt-local" })?.id).toBe("stt-local");
    expect(registry.selectTTSBackend({ providerKind: "cloud" })?.id).toBe("tts-cloud");
  });

  it("returns a snapshot and supports reset", () => {
    const registry = new VoiceBackendRegistry();
    registry.registerSTTBackend(makeSTT("stt-1", "local"));
    registry.registerTTSBackend(makeTTS("tts-1", "byok"));

    const snapshot = registry.getSnapshot();
    expect(snapshot.sttBackends[0].id).toBe("stt-1");
    expect(snapshot.ttsBackends[0].id).toBe("tts-1");

    registry.reset();
    expect(registry.listSTTBackends()).toHaveLength(0);
    expect(registry.listTTSBackends()).toHaveLength(0);
  });
});
