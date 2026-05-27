import { describe, expect, it } from "vitest";
import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { VoiceProviderRouter } from "./VoiceProviderRouter";
import { LucaSTTBackend, LucaTTSBackend } from "./types";

function makeSTT(id: string, providerKind: "local" | "cloud" | "byok", supportsStreaming = true, supportedLanguages = ["en"]) : LucaSTTBackend {
  return {
    id,
    label: id,
    providerKind,
    supportsStreaming,
    supportedLanguages,
    transcribe: async () => ({ transcript: "ok", language: "en", confidence: 1, isFinal: true }),
    getSnapshot: () => ({ id, label: id, providerKind, supportsStreaming, supportedLanguages }),
  };
}

function makeTTS(id: string, providerKind: "local" | "cloud" | "byok", opts?: { supportsStreaming?: boolean; supportsVoiceClone?: boolean; supportsEmotion?: boolean; supportedLanguages?: string[] }): LucaTTSBackend {
  const supportsStreaming = opts?.supportsStreaming ?? false;
  const supportsVoiceClone = opts?.supportsVoiceClone ?? false;
  const supportsEmotion = opts?.supportsEmotion ?? false;
  const supportedLanguages = opts?.supportedLanguages ?? ["en"];
  return {
    id,
    label: id,
    providerKind,
    supportsStreaming,
    supportsVoiceClone,
    supportsEmotion,
    supportedLanguages,
    synthesize: async () => ({ outputEvent: { kind: "tts_completed", text: "ok" } }),
    getSnapshot: () => ({ id, label: id, providerKind, supportsStreaming, supportsVoiceClone, supportsEmotion, supportedLanguages }),
  };
}

describe("VoiceProviderRouter", () => {
  it("routes STT to matching local backend", () => {
    const registry = new VoiceBackendRegistry();
    registry.registerSTTBackend(makeSTT("stt-local", "local"));
    const router = new VoiceProviderRouter(registry);

    const result = router.route({ capability: "stt", preference: "local" });
    expect(result.ok).toBe(true);
    expect(result.selectedBackendId).toBe("stt-local");
  });

  it("routes TTS to matching cloud backend", () => {
    const registry = new VoiceBackendRegistry();
    registry.registerTTSBackend(makeTTS("tts-local", "local"));
    registry.registerTTSBackend(makeTTS("tts-cloud", "cloud"));
    const router = new VoiceProviderRouter(registry);

    const result = router.route({ capability: "tts", preference: "cloud" });
    expect(result.selectedBackendId).toBe("tts-cloud");
  });

  it("auto fallback chooses local first", () => {
    const registry = new VoiceBackendRegistry();
    registry.registerSTTBackend(makeSTT("stt-cloud", "cloud"));
    registry.registerSTTBackend(makeSTT("stt-local", "local"));
    const router = new VoiceProviderRouter(registry);

    const result = router.route({ capability: "stt", preference: "auto" });
    expect(result.selectedProviderKind).toBe("local");
    expect(result.fallbackUsed).toBe(false);
  });

  it("streaming requirement filters unsupported backends", () => {
    const registry = new VoiceBackendRegistry();
    registry.registerSTTBackend(makeSTT("stt-local", "local", false));
    registry.registerSTTBackend(makeSTT("stt-cloud", "cloud", true));
    const router = new VoiceProviderRouter(registry);

    const result = router.route({ capability: "stt", preference: "local", requiresStreaming: true });
    expect(result.selectedBackendId).toBe("stt-cloud");
    expect(result.fallbackUsed).toBe(true);
  });

  it("voice clone requirement filters unsupported TTS backends", () => {
    const registry = new VoiceBackendRegistry();
    registry.registerTTSBackend(makeTTS("tts-local", "local", { supportsVoiceClone: false }));
    registry.registerTTSBackend(makeTTS("tts-byok", "byok", { supportsVoiceClone: true }));
    const router = new VoiceProviderRouter(registry);

    const result = router.route({ capability: "tts", preference: "local", requiresVoiceClone: true });
    expect(result.selectedBackendId).toBe("tts-byok");
  });

  it("emotion requirement filters unsupported TTS backends", () => {
    const registry = new VoiceBackendRegistry();
    registry.registerTTSBackend(makeTTS("tts-local", "local", { supportsEmotion: false }));
    registry.registerTTSBackend(makeTTS("tts-cloud", "cloud", { supportsEmotion: true }));
    const router = new VoiceProviderRouter(registry);

    const result = router.route({ capability: "tts", preference: "local", requiresEmotion: true });
    expect(result.selectedBackendId).toBe("tts-cloud");
  });

  it("language mismatch fails safely", () => {
    const registry = new VoiceBackendRegistry();
    registry.registerSTTBackend(makeSTT("stt-local", "local", true, ["en"]));
    const router = new VoiceProviderRouter(registry);

    const result = router.route({ capability: "stt", language: "fr" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("no_matching_backend");
  });

  it("no backend fails safely", () => {
    const router = new VoiceProviderRouter(new VoiceBackendRegistry());
    const result = router.route({ capability: "tts" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("no_matching_backend");
  });

  it("metadata shows no audio/STT/TTS/system/heavy model APIs called", () => {
    const registry = new VoiceBackendRegistry();
    registry.registerSTTBackend(makeSTT("stt-local", "local"));
    const router = new VoiceProviderRouter(registry);

    const result = router.route({ capability: "stt" });
    expect(result.metadata.audioApisCalled).toBe(false);
    expect(result.metadata.sttApisCalled).toBe(false);
    expect(result.metadata.ttsApisCalled).toBe(false);
    expect(result.metadata.systemApisCalled).toBe(false);
    expect(result.metadata.heavyModelsLoaded).toBe(false);
  });
});
