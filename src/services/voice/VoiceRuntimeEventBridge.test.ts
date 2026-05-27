import { describe, expect, it } from "vitest";
import { VoiceInMemoryTapeSink } from "./VoiceInMemoryTapeSink";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";

describe("VoiceRuntimeEventBridge", () => {
  it("records events and redacts sensitive keys", () => {
    const sink = new VoiceInMemoryTapeSink();
    const bridge = new VoiceRuntimeEventBridge(sink);

    bridge.recordTranscript({
      sessionId: "s1",
      transcript: "hello",
      language: "en",
      confidence: 1,
      isFinal: true,
      source: "manual",
      metadata: { apiKey: "secret", nested: { userToken: "tkn" } },
    });

    const record = sink.getSnapshot("s1").records[0];
    expect(record.eventType).toBe("voice_transcript_received");
    expect((record.payload.metadata as Record<string, unknown>).apiKey).toBe("[REDACTED]");
    expect((((record.payload.metadata as Record<string, unknown>).nested as Record<string, unknown>).userToken)).toBe("[REDACTED]");
  });

  it("falls back to unknown session id", () => {
    const sink = new VoiceInMemoryTapeSink();
    const bridge = new VoiceRuntimeEventBridge(sink);

    bridge.recordCommandResult({ status: "handled", metadata: { runtimeKind: "voice_scaffold", audioApisCalled: false, sttApisCalled: false, ttsApisCalled: false, systemApisCalled: false, heavyModelsLoaded: false, storageWritesEnabled: false, requiresExplicitOptIn: true } }, {});
    expect(sink.getSnapshot().records[0].sessionId).toBe("unknown");
  });
});
