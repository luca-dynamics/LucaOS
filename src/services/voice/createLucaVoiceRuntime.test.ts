import { describe, expect, it } from "vitest";
import { createLucaVoiceRuntime } from "./createLucaVoiceRuntime";

describe("createLucaVoiceRuntime", () => {
  it("composes runtime with scaffold adapters, routing, streaming, audio api, tape, snapshot, and reset", () => {
    const composed = createLucaVoiceRuntime();

    expect(composed.registry.listSTTBackends()).toHaveLength(3);
    expect(composed.registry.listTTSBackends()).toHaveLength(3);

    expect(composed.providerRouter.route({ capability: "stt", preference: "local" }).selectedProviderKind).toBe("local");
    expect(composed.providerRouter.route({ capability: "stt", preference: "cloud" }).selectedProviderKind).toBe("cloud");
    expect(composed.providerRouter.route({ capability: "stt", preference: "byok" }).selectedProviderKind).toBe("byok");
    expect(composed.providerRouter.route({ capability: "stt", preference: "auto" }).selectedProviderKind).toBe("local");

    const sttStream = composed.streamingRuntime.openStream({ kind: "stt", providerPreference: "cloud" });
    expect(sttStream.selectedBackendId).toBe("voice.luca-prime.stub.stt");

    const speech = composed.audioApi.createSpeech({ model: "gpt-voice", input: "hello", providerPreference: "byok" });
    expect(speech.selectedBackendId).toBe("voice.byok.stub.tts");

    const result = composed.runtime.handleTranscript({ kind: "partial", transcript: "test command", confidence: 0.8 });
    expect(result.status).toBe("handled");
    expect(composed.tapeSink.getSnapshot().totalRecords).toBeGreaterThan(0);

    const snapshot = composed.getSnapshot();
    expect(snapshot.registeredSttBackendCount).toBe(3);
    expect(snapshot.registeredTtsBackendCount).toBe(3);
    expect(snapshot.metadata).toMatchObject({
      factoryKind: "luca_voice_runtime_scaffold",
      audioApisCalled: false,
      microphoneApisCalled: false,
      sttApisCalled: false,
      ttsApisCalled: false,
      providerApisCalled: false,
      networkApisCalled: false,
      heavyModelsLoaded: false,
      systemApisCalled: false,
      requiresExplicitOptIn: true,
    });

    composed.reset();
    expect(composed.runtime.getState().status).toBe("idle");
    expect(composed.streamingRuntime.getSnapshot().totalSessions).toBe(0);
    expect(composed.audioApi.getSnapshot().speechRequests).toBe(0);
    expect(composed.providerRouter.getSnapshot().totalRoutes).toBe(0);
    expect(composed.tapeSink.getSnapshot().totalRecords).toBe(0);
    expect(composed.registry.listSTTBackends()).toHaveLength(3);
    expect(composed.registry.listTTSBackends()).toHaveLength(3);
  });

  it("supports disabling adapter lanes", () => {
    const composed = createLucaVoiceRuntime({ enableByokVoiceAdapter: false });

    expect(composed.registry.selectSTTBackend({ providerKind: "local" })).toBeDefined();
    expect(composed.registry.selectSTTBackend({ providerKind: "cloud" })).toBeDefined();
    expect(composed.registry.selectSTTBackend({ providerKind: "byok" })).toBeUndefined();
  });

  it("snapshot exposes readiness summary and no-call readiness metadata", () => {
    const composed = createLucaVoiceRuntime({
      realProviderFeatureFlags: {
        enableRealLocalVoiceProvider: true,
        enableRealLucaPrimeVoiceProvider: true,
        enableRealByokVoiceProvider: true,
        enableRealStt: true,
        enableRealTts: true,
      },
    });

    const snapshot = composed.getSnapshot();
    expect(snapshot.providerReadinessSummary.local.stt.status).toBe("scaffold_only");
    expect(snapshot.providerReadinessSummary.cloud.tts.status).toBe("scaffold_only");
    expect(snapshot.providerReadinessSummary.byok.stt.status).toBe("scaffold_only");

    expect(snapshot.providerReadinessSummary.local.stt.metadata).toMatchObject({
      readinessKind: "voice_provider_readiness_scaffold",
      audioApisCalled: false,
      microphoneApisCalled: false,
      sttApisCalled: false,
      ttsApisCalled: false,
      providerApisCalled: false,
      networkApisCalled: false,
      heavyModelsLoaded: false,
      systemApisCalled: false,
      requiresExplicitOptIn: true,
    });
  });
});
