import { describe, expect, it } from "vitest";
import { LiveVoiceRuntimeBridge } from "./LiveVoiceRuntimeBridge";

describe("LiveVoiceRuntimeBridge", () => {
  it("maps connected idle to idle", () => {
    const bridge = new LiveVoiceRuntimeBridge();
    bridge.syncFromLiveSession({ status: "CONNECTED", sessionId: "s1" });
    expect(bridge.getRealtimeState().status).toBe("idle");
  });

  it("maps VAD active to listening", () => {
    const bridge = new LiveVoiceRuntimeBridge();
    bridge.syncFromLiveSession({ isVadActive: true });
    expect(bridge.getRealtimeState().status).toBe("listening");
  });

  it("maps partial transcript to transcribing", () => {
    const bridge = new LiveVoiceRuntimeBridge();
    bridge.syncFromLiveSession({ partialTranscript: "hel" });
    expect(bridge.getRealtimeState().status).toBe("transcribing");
    expect(bridge.getRealtimeState().currentTranscript).toBe("hel");
  });

  it("maps final transcript to thinking", () => {
    const bridge = new LiveVoiceRuntimeBridge();
    bridge.syncFromLiveSession({ finalTranscript: "hello" });
    expect(bridge.getRealtimeState().status).toBe("thinking");
    expect(bridge.getRealtimeState().currentTranscript).toBe("hello");
  });

  it("maps speaking to speaking", () => {
    const bridge = new LiveVoiceRuntimeBridge();
    bridge.syncFromLiveSession({ isSpeaking: true, currentResponse: "hi" });
    expect(bridge.getRealtimeState().status).toBe("speaking");
    expect(bridge.getRealtimeState().isSpeaking).toBe(true);
  });

  it("maps reconnecting to recovering", () => {
    const bridge = new LiveVoiceRuntimeBridge();
    bridge.syncFromLiveSession({ status: "RECONNECTING" });
    expect(bridge.getRealtimeState().status).toBe("recovering");
  });

  it("maps hard error to failed", () => {
    const bridge = new LiveVoiceRuntimeBridge();
    bridge.syncFromLiveSession({ status: "ERROR", error: "boom" });
    expect(bridge.getRealtimeState().status).toBe("failed");
    expect(bridge.getRealtimeState().lastError).toBe("boom");
  });

  it("preserves latency route fallback provider model metadata", () => {
    const bridge = new LiveVoiceRuntimeBridge();
    bridge.syncFromLiveSession({ routeKind: "CLOUD_BIDI", provider: "openai", model: "gpt-realtime" });
    bridge.syncFromDiagnostics({ orchestrator: { responseLatencyMs: 120, routingHealth: "healthy", adaptiveRouteApplied: true } });
    const snap = bridge.getSnapshot();
    expect(snap.metadata.routeKind).toBe("CLOUD_BIDI");
    expect(snap.metadata.provider).toBe("openai");
    expect(snap.metadata.model).toBe("gpt-realtime");
    expect(snap.metadata.latencyMs).toBe(120);
    expect(snap.metadata.routingHealth).toBe("healthy");
    expect(snap.metadata.adaptiveFallbackActive).toBe(true);
  });

  it("preserves wake-word and preset metadata", () => {
    const bridge = new LiveVoiceRuntimeBridge();
    bridge.syncFromSettings({ voice: { wakeWordEnabled: true, preset: "balanced", sttModel: "cloud-gemini" } });
    const snap = bridge.getSnapshot();
    expect(snap.metadata.wakeWordEnabled).toBe(true);
    expect(snap.metadata.preset).toBe("balanced");
    expect(snap.metadata.sttMode).toBe("cloud");
  });

  it("reset clears bridge snapshot", () => {
    const bridge = new LiveVoiceRuntimeBridge();
    bridge.syncFromLiveSession({ isVadActive: true, provider: "openai" });
    bridge.reset();
    const snap = bridge.getSnapshot();
    expect(snap.realtime.status).toBe("idle");
    expect(snap.metadata.provider).toBeUndefined();
  });

  it("remains mirror-only and does not expose provider/network/audio APIs", () => {
    const bridge = new LiveVoiceRuntimeBridge() as any;
    expect(typeof bridge.connect).toBe("undefined");
    expect(typeof bridge.startMicrophone).toBe("undefined");
    expect(typeof bridge.callProvider).toBe("undefined");
  });
});
