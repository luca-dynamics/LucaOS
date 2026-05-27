import { describe, expect, it, vi } from "vitest";
import { VoiceMockProviderTransport } from "./VoiceMockProviderTransport";
import { VoiceOpenAICompatibleProviderAdapter } from "./VoiceOpenAICompatibleProviderAdapter";

describe("VoiceOpenAICompatibleProviderAdapter", () => {
  it("maps speech request to /v1/audio/speech and blocks when network disabled", async () => {
    const transport = new VoiceMockProviderTransport();
    const adapter = new VoiceOpenAICompatibleProviderAdapter({ transport, apiKey: "k" });

    const result = await adapter.createSpeech({ model: "gpt-4o-mini-tts", input: "hello", voice: "alloy" });
    expect(result.status).toBe("invocation_disabled");
    expect(transport.getSnapshot().requestCount).toBe(0);
    expect((result.metadata.request as { path: string }).path).toBe("/v1/audio/speech");
  });

  it("maps transcription request and calls transport when enabled", async () => {
    const transport = new VoiceMockProviderTransport();
    const adapter = new VoiceOpenAICompatibleProviderAdapter({ enableNetworkProviderCalls: true, transport, allowUnauthenticatedMock: true });

    const result = await adapter.createTranscription({ filePlaceholder: "file://audio.wav", model: "gpt-4o-transcribe" });
    expect(result.ok).toBe(true);
    expect(transport.getSnapshot().requestCount).toBe(1);
    expect(transport.getSnapshot().requests[0].path).toBe("/v1/audio/transcriptions");
  });

  it("blocks missing apiKey for non-mock transport and does not use global fetch", async () => {
    const send = vi.fn(async () => ({ ok: true, metadata: {} }));
    const adapter = new VoiceOpenAICompatibleProviderAdapter({
      enableNetworkProviderCalls: true,
      transport: { kind: "custom", send },
    });

    const result = await adapter.createSpeech({ model: "m", input: "x" });
    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("missing_api_key");
    expect(send).not.toHaveBeenCalled();
  });

  it("tracks snapshot metadata/counters and reset", async () => {
    const transport = new VoiceMockProviderTransport();
    const adapter = new VoiceOpenAICompatibleProviderAdapter({ enableNetworkProviderCalls: true, transport, allowUnauthenticatedMock: true });
    await adapter.createSpeech({ model: "m", input: "hi" });
    await adapter.listVoices();

    const snapshot = adapter.getSnapshot();
    expect(snapshot.counters.speechRequests).toBe(1);
    expect(snapshot.metadata).toMatchObject({
      adapterKind: "openai_compatible_voice_provider",
      providerApisCalled: true,
      audioApisCalled: false,
      microphoneApisCalled: false,
      systemApisCalled: false,
      heavyModelsLoaded: false,
      requiresExplicitOptIn: true,
    });

    adapter.reset();
    expect(adapter.getSnapshot().counters.speechRequests).toBe(0);
  });
});
