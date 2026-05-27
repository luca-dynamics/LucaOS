import { describe, expect, it } from "vitest";
import { VoiceBackendRegistry } from "./VoiceBackendRegistry";
import { VoiceInMemoryTapeSink } from "./VoiceInMemoryTapeSink";
import { VoiceProviderRouter } from "./VoiceProviderRouter";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";
import { VoiceStreamingRuntime } from "./VoiceStreamingRuntime";
import { LucaSTTBackend, LucaTTSBackend, LucaVoiceTapeSink } from "./types";

function makeSTT(id: string): LucaSTTBackend {
  return {
    id,
    label: id,
    providerKind: "local",
    supportsStreaming: true,
    supportedLanguages: ["en"],
    transcribe: async () => ({ transcript: "ok", language: "en", confidence: 1, isFinal: true }),
    getSnapshot: () => ({ id, label: id, providerKind: "local", supportsStreaming: true, supportedLanguages: ["en"] }),
  };
}

function makeTTS(id: string): LucaTTSBackend {
  return {
    id,
    label: id,
    providerKind: "cloud",
    supportsStreaming: true,
    supportsVoiceClone: false,
    supportsEmotion: false,
    supportedLanguages: ["en"],
    synthesize: async () => ({ outputEvent: { kind: "tts_completed", text: "ok" } }),
    getSnapshot: () => ({
      id,
      label: id,
      providerKind: "cloud",
      supportsStreaming: true,
      supportsVoiceClone: false,
      supportsEmotion: false,
      supportedLanguages: ["en"],
    }),
  };
}

class ThrowSink implements LucaVoiceTapeSink {
  record(): void {
    throw new Error("sink failure");
  }
  listRecords() { return []; }
  getSnapshot() { return { totalRecords: 0, records: [] }; }
  reset() {}
}

describe("VoiceStreamingRuntime", () => {
  it("opens STT stream scaffold", () => {
    const runtime = new VoiceStreamingRuntime();
    const session = runtime.openStream({ kind: "stt", language: "en" });
    expect(session.kind).toBe("stt");
    expect(session.status).toBe("streaming");
  });

  it("opens TTS stream scaffold", () => {
    const runtime = new VoiceStreamingRuntime();
    const session = runtime.openStream({ kind: "tts", language: "en" });
    expect(session.kind).toBe("tts");
    expect(session.status).toBe("streaming");
  });

  it("uses provider router when provided", () => {
    const registry = new VoiceBackendRegistry();
    registry.registerSTTBackend(makeSTT("stt-local"));
    registry.registerTTSBackend(makeTTS("tts-cloud"));
    const runtime = new VoiceStreamingRuntime(new VoiceProviderRouter(registry));

    const stt = runtime.openStream({ kind: "stt", providerPreference: "local" });
    const tts = runtime.openStream({ kind: "tts", providerPreference: "cloud" });

    expect(stt.selectedBackendId).toBe("stt-local");
    expect(tts.selectedBackendId).toBe("tts-cloud");
  });

  it("pushChunk increments sequence and records text/audio metadata", () => {
    const runtime = new VoiceStreamingRuntime();
    const session = runtime.openStream({ kind: "stt" });
    const first = runtime.pushChunk({ streamId: session.streamId, kind: "stt", text: "hello", metadata: { channel: "text" } });
    const second = runtime.pushChunk({ streamId: session.streamId, kind: "stt", audioChunk: "AAAA", metadata: { channel: "audio" } });

    expect(first?.sequence).toBe(1);
    expect(second?.sequence).toBe(2);
    expect(second?.audioChunk).toBe("AAAA");

    const snapshot = runtime.getSnapshot(session.streamId);
    expect(snapshot.chunks).toHaveLength(2);
    expect(snapshot.chunks[0].metadata?.channel).toBe("text");
    expect(snapshot.chunks[1].metadata?.channel).toBe("audio");
  });

  it("pause complete interrupt fail update status", () => {
    const runtime = new VoiceStreamingRuntime();
    const paused = runtime.pauseStream(runtime.openStream({ kind: "stt" }).streamId);
    expect(paused?.status).toBe("paused");

    const completed = runtime.completeStream(runtime.openStream({ kind: "tts" }).streamId);
    expect(completed?.status).toBe("completed");

    const interrupted = runtime.interruptStream(runtime.openStream({ kind: "stt" }).streamId);
    expect(interrupted?.status).toBe("interrupted");

    const failed = runtime.failStream(runtime.openStream({ kind: "tts" }).streamId, "test-failed");
    expect(failed?.status).toBe("failed");
    expect(failed?.metadata.reason).toBe("test-failed");
  });

  it("snapshot filters by streamId", () => {
    const runtime = new VoiceStreamingRuntime();
    const one = runtime.openStream({ kind: "stt" });
    runtime.openStream({ kind: "tts" });

    const filtered = runtime.getSnapshot(one.streamId);
    expect(filtered.totalSessions).toBe(1);
    expect(filtered.sessions[0].streamId).toBe(one.streamId);
  });

  it("reset clears sessions", () => {
    const runtime = new VoiceStreamingRuntime();
    runtime.openStream({ kind: "stt" });
    runtime.reset();
    expect(runtime.getSnapshot().totalSessions).toBe(0);
  });

  it("recording failure is non-fatal", () => {
    const bridge = new VoiceRuntimeEventBridge(new ThrowSink());
    const runtime = new VoiceStreamingRuntime(undefined, bridge);
    expect(() => runtime.openStream({ kind: "stt" })).not.toThrow();
    const session = runtime.openStream({ kind: "tts" });
    expect(() => runtime.completeStream(session.streamId)).not.toThrow();
  });

  it("metadata shows no audio/mic/STT/TTS/WebSocket/system/heavy model APIs called", () => {
    const bridge = new VoiceRuntimeEventBridge(new VoiceInMemoryTapeSink());
    const runtime = new VoiceStreamingRuntime(undefined, bridge);
    runtime.openStream({ kind: "stt" });
    const metadata = runtime.getSnapshot().metadata;
    expect(metadata.audioApisCalled).toBe(false);
    expect(metadata.microphoneApisCalled).toBe(false);
    expect(metadata.sttApisCalled).toBe(false);
    expect(metadata.ttsApisCalled).toBe(false);
    expect(metadata.websocketOpened).toBe(false);
    expect(metadata.systemApisCalled).toBe(false);
    expect(metadata.heavyModelsLoaded).toBe(false);
  });
});
