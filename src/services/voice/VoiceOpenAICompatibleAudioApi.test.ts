import { describe, expect, it } from "vitest";
import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { VoiceOpenAICompatibleAudioApi } from "./VoiceOpenAICompatibleAudioApi";
import { VoiceProviderRouter } from "./VoiceProviderRouter";
import { LucaTTSBackend } from "./types";

function makeTTS(id: string, providerKind: "local" | "cloud" | "byok", languages = ["en"]): LucaTTSBackend {
  return {
    id,
    label: id,
    providerKind,
    supportsStreaming: false,
    supportsVoiceClone: false,
    supportsEmotion: false,
    supportedLanguages: languages,
    synthesize: async () => ({ outputEvent: { kind: "tts_completed", text: "ok" } }),
    getSnapshot: () => ({ id, label: id, providerKind, supportsStreaming: false, supportsVoiceClone: false, supportsEmotion: false, supportedLanguages: languages }),
  };
}

describe("VoiceOpenAICompatibleAudioApi", () => {
  it("createSpeech returns placeholder speech result", () => {
    const api = new VoiceOpenAICompatibleAudioApi();
    const result = api.createSpeech({ model: "gpt-4o-mini-tts", input: "hello" });
    expect(result.ok).toBe(true);
    expect(result.audioPlaceholder).toContain("audio_placeholder:");
  });

  it("createTranscription returns placeholder transcription result", () => {
    const api = new VoiceOpenAICompatibleAudioApi();
    const result = api.createTranscription({ filePlaceholder: "audio:file:1" });
    expect(result.ok).toBe(true);
    expect(result.text).toContain("transcription_placeholder:");
    expect(result.segments).toEqual([]);
  });

  it("provider router selection is used when available", () => {
    const registry = new VoiceBackendRegistry();
    registry.registerTTSBackend(makeTTS("tts-cloud", "cloud"));
    const router = new VoiceProviderRouter(registry);
    const api = new VoiceOpenAICompatibleAudioApi(router, registry);

    const speech = api.createSpeech({ model: "tts", input: "hi", providerPreference: "cloud" });
    expect(speech.selectedBackendId).toBe("tts-cloud");
    expect(speech.selectedProviderKind).toBe("cloud");
  });

  it("listVoices returns registered backends or scaffold placeholders", () => {
    const emptyApi = new VoiceOpenAICompatibleAudioApi();
    const emptyVoices = emptyApi.listVoices();
    expect(emptyVoices.voices[0]).toMatchObject({ id: "scaffold-default" });

    const registry = new VoiceBackendRegistry();
    registry.registerTTSBackend(makeTTS("tts-local", "local", ["en", "fr"]));
    const api = new VoiceOpenAICompatibleAudioApi(undefined, registry);
    const voices = api.listVoices();
    expect(voices.voices[0]).toMatchObject({ id: "tts-local", providerKind: "local" });
  });

  it("unsupported or missing input fails safely", () => {
    const api = new VoiceOpenAICompatibleAudioApi();
    expect(api.createSpeech({ model: "", input: "" }).ok).toBe(false);
    expect(api.createTranscription({}).ok).toBe(false);
  });

  it("metadata shows no HTTP/audio/mic/STT/TTS/provider/system/heavy model APIs called", () => {
    const api = new VoiceOpenAICompatibleAudioApi();
    const result = api.createSpeech({ model: "tts", input: "hello" });
    expect(result.metadata.httpServerStarted).toBe(false);
    expect(result.metadata.audioApisCalled).toBe(false);
    expect(result.metadata.microphoneApisCalled).toBe(false);
    expect(result.metadata.sttApisCalled).toBe(false);
    expect(result.metadata.ttsApisCalled).toBe(false);
    expect(result.metadata.providerApisCalled).toBe(false);
    expect(result.metadata.systemApisCalled).toBe(false);
    expect(result.metadata.heavyModelsLoaded).toBe(false);
  });

  it("reset clears counters and snapshot", () => {
    const api = new VoiceOpenAICompatibleAudioApi();
    api.createSpeech({ model: "tts", input: "hello" });
    api.createTranscription({ filePlaceholder: "f" });
    api.listVoices();
    api.reset();

    const snapshot = api.getSnapshot();
    expect(snapshot.speechRequests).toBe(0);
    expect(snapshot.transcriptionRequests).toBe(0);
    expect(snapshot.voiceListRequests).toBe(0);
    expect(snapshot.lastSpeechResult).toBeUndefined();
    expect(snapshot.lastTranscriptionResult).toBeUndefined();
  });
});
