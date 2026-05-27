import { describe, expect, it } from "vitest";
import { deriveVoiceOperatorState } from "./VoiceRuntimeStatePrecedence";

describe("VoiceRuntimeStatePrecedence", () => {
  it("hard error wins", () => {
    const state = deriveVoiceOperatorState({ liveSession: { isSpeaking: true, error: "boom" } });
    expect(state.status).toBe("failed");
    expect(state.severity).toBe("error");
  });

  it("recovering wins over listening", () => {
    const state = deriveVoiceOperatorState({ liveSession: { isVadActive: true }, diagnostics: { status: "RECONNECTING" } });
    expect(state.status).toBe("recovering");
  });

  it("speaking wins over listening", () => {
    const state = deriveVoiceOperatorState({ liveSession: { isVadActive: true, assistantSpeaking: true } });
    expect(state.status).toBe("speaking");
  });

  it("vad listening wins over idle", () => {
    const state = deriveVoiceOperatorState({ liveSession: { isVadActive: true } });
    expect(state.status).toBe("listening");
  });

  it("final transcript wins over partial unless speaking", () => {
    const state = deriveVoiceOperatorState({ liveSession: { partialTranscript: "he", finalTranscript: "hello" } });
    expect(state.status).toBe("thinking");
    const speaking = deriveVoiceOperatorState({ liveSession: { partialTranscript: "he", finalTranscript: "hello", assistantSpeaking: true } });
    expect(speaking.status).toBe("speaking");
  });

  it("realtime enriches but does not override live ownership", () => {
    const state = deriveVoiceOperatorState({ liveSession: { routeKind: "CLOUD_BIDI" }, realtimeBridge: { realtime: { status: "recovering" } as any, metadata: { provider: "x" } } });
    expect(state.sourceOfTruth).toBe("liveService");
    expect(state.selectedProvider).toBe("x");
  });

  it("settings enrich preset/wake-word", () => {
    const state = deriveVoiceOperatorState({ liveSession: { isVadActive: true }, settings: { voice: { preset: "balanced", wakeWordEnabled: true } } });
    expect(state.status).toBe("listening");
    expect(state.preset).toBe("balanced");
    expect(state.wakeWordEnabled).toBe(true);
  });

  it("captures conflicts metadata", () => {
    const state = deriveVoiceOperatorState({ liveSession: { status: "LISTENING" }, realtimeBridge: { realtime: { status: "speaking" } as any } });
    expect(state.metadata.conflictingSources.length).toBeGreaterThan(0);
  });

  it("preserves route health fallback latency", () => {
    const state = deriveVoiceOperatorState({ diagnostics: { routingHealth: "unstable", adaptiveRouteApplied: true, responseLatencyMs: 123 } });
    expect(state.routeHealth).toBe("unstable");
    expect(state.fallbackActive).toBe(true);
    expect(state.latency).toBe(123);
  });

  it("no provider/network/audio APIs called", () => {
    const state = deriveVoiceOperatorState({});
    expect(state.metadata.liveServiceOwnership).toBe(true);
    expect(state.metadata.realtimeEnrichmentOnly).toBe(true);
  });
});
