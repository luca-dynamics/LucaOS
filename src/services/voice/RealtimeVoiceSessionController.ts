import { VoiceHudRuntimeBridge } from "./VoiceHudRuntimeBridge";
import { VoiceHudSubscriptionBridge } from "./VoiceHudSubscriptionBridge";
import { VoiceRuntime } from "./VoiceRuntime";
import { VoiceRuntimeEventBridge } from "./VoiceRuntimeEventBridge";
import { VoiceStreamingRuntime } from "./VoiceStreamingRuntime";
import {
  LucaRealtimeVoiceControllerMetadata,
  LucaRealtimeVoiceEventType,
  LucaRealtimeVoiceLatencyBudget,
  LucaRealtimeVoiceSessionState,
  LucaRealtimeVoiceTurn,
} from "./types";

export type RealtimeVoiceHudLikeBridge = Pick<
  VoiceHudRuntimeBridge | VoiceHudSubscriptionBridge,
  "updateTranscript" | "updateResponse" | "updateError" | "sendControl"
>;

export interface RealtimeVoiceSessionControllerOptions {
  runtime?: VoiceRuntime;
  streamingRuntime?: VoiceStreamingRuntime;
  eventBridge?: VoiceRuntimeEventBridge;
  hudBridge?: RealtimeVoiceHudLikeBridge;
}

export type RealtimeVoiceSessionListener = (state: LucaRealtimeVoiceSessionState) => void;

const controllerMetadata: LucaRealtimeVoiceControllerMetadata = {
  controllerKind: "realtime_voice_session_controller",
  runtimeKind: "realtime_voice_session_controller",
  audioApisCalled: false,
  microphoneApisCalled: false,
  audioOutputApisCalled: false,
  sttApisCalled: false,
  ttsApisCalled: false,
  providerApisCalled: false,
  networkApisCalled: false,
  heavyModelsLoaded: false,
  storageWritesEnabled: false,
  systemApisCalled: false,
  requiresExplicitOptIn: true,
};

const createInitialState = (): LucaRealtimeVoiceSessionState => ({
  status: "idle",
  isListening: false,
  isSpeaking: false,
  canInterrupt: true,
  latencyBudget: {},
  counters: {},
  metadata: { ...controllerMetadata },
});

export class RealtimeVoiceSessionController {
  private state: LucaRealtimeVoiceSessionState = createInitialState();
  private listeners = new Set<RealtimeVoiceSessionListener>();

  constructor(private readonly options: RealtimeVoiceSessionControllerOptions = {}) {}

  startSession(options?: { sessionId?: string; latencyBudget?: LucaRealtimeVoiceLatencyBudget; metadata?: Record<string, unknown> }) {
    this.apply({
      ...this.state,
      sessionId: options?.sessionId ?? this.state.sessionId ?? `voice_session_${Date.now()}`,
      status: "idle",
      lastError: undefined,
      latencyBudget: { ...this.state.latencyBudget, ...(options?.latencyBudget ?? {}) },
      metadata: { ...this.state.metadata, ...(options?.metadata ?? {}) },
    }, "session_started");
  }

  stopSession(_reason?: string) { this.apply({ ...this.state, status: "idle", isListening: false, isSpeaking: false, activeTurn: undefined, currentResponse: undefined, currentTranscript: undefined }, "session_stopped"); }
  startListening() { this.apply({ ...this.state, status: "listening", isListening: true }, "listening_started"); }
  stopListening() { this.apply({ ...this.state, status: this.state.isSpeaking ? "speaking" : "idle", isListening: false }, "listening_stopped"); }

  receivePartialTranscript(text: string, metadata?: Record<string, unknown>) {
    if (this.state.isSpeaking && this.state.canInterrupt) {
      this.detectBargeIn(metadata);
      this.interrupt("barge_in");
      return;
    }
    const turn = this.getOrCreateTurn();
    const updated: LucaRealtimeVoiceTurn = { ...turn, status: "partial", partialTranscript: text, metadata: { ...(turn.metadata ?? {}), ...(metadata ?? {}) } };
    this.safeRecordTranscript(text, "partial", metadata);
    this.safeHud(() => this.options.hudBridge?.updateTranscript(text));
    this.apply({ ...this.state, status: "transcribing", currentTranscript: text, activeTurn: updated, counters: this.bump("partialsReceived") }, "partial_transcript");
  }

  receiveFinalTranscript(text: string, metadata?: Record<string, unknown>) {
    const turn = this.getOrCreateTurn();
    const updated: LucaRealtimeVoiceTurn = { ...turn, status: "final", finalTranscript: text, completedAt: new Date().toISOString(), metadata: { ...(turn.metadata ?? {}), ...(metadata ?? {}) } };
    this.safeRecordTranscript(text, "final", metadata);
    this.safeHud(() => this.options.hudBridge?.updateTranscript(text));
    this.apply({ ...this.state, status: "thinking", isListening: false, currentTranscript: text, activeTurn: updated, counters: this.bump("finalsReceived") }, "final_transcript");
  }

  startThinking(metadata?: Record<string, unknown>) { this.apply({ ...this.state, status: "thinking", metadata: { ...this.state.metadata, ...(metadata ?? {}) } }, "thinking_started"); }
  startSpeaking(responseText: string, metadata?: Record<string, unknown>) {
    this.safeOutput("tts_started", responseText, metadata);
    this.safeHud(() => this.options.hudBridge?.updateResponse(responseText));
    this.apply({ ...this.state, status: "speaking", isSpeaking: true, currentResponse: responseText, counters: this.bump("speakStarted") }, "speaking_started");
  }
  completeSpeaking(metadata?: Record<string, unknown>) {
    this.safeOutput("tts_completed", this.state.currentResponse ?? "", metadata);
    this.safeHud(() => this.options.hudBridge?.updateResponse(undefined));
    this.apply({ ...this.state, status: "idle", isSpeaking: false, currentResponse: undefined, counters: this.bump("speakCompleted") }, "speaking_completed");
  }
  interrupt(_reason?: string) {
    const interrupted = this.state.isSpeaking;
    this.safeOutput("tts_interrupted", this.state.currentResponse ?? "", { reason: _reason });
    this.safeHud(() => this.options.hudBridge?.sendControl("interrupt"));
    this.apply({ ...this.state, status: interrupted ? "interrupted" : this.state.status, isSpeaking: false, currentResponse: undefined, counters: interrupted ? this.bump("interruptions") : this.state.counters }, "interrupted");
  }
  detectBargeIn(metadata?: Record<string, unknown>) { this.safeCommandMeta("barge_in_detected", metadata); this.apply({ ...this.state, counters: this.bump("bargeInsDetected") }, "barge_in_detected"); }
  startRecovery(reason?: string) { this.apply({ ...this.state, status: "recovering", metadata: { ...this.state.metadata, recoveryReason: reason } }, "recovery_started"); }
  completeRecovery(metadata?: Record<string, unknown>) { this.apply({ ...this.state, status: "idle", metadata: { ...this.state.metadata, ...(metadata ?? {}) } }, "recovery_completed"); }
  failSession(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    this.safeHud(() => this.options.hudBridge?.updateError(message));
    this.apply({ ...this.state, status: "failed", lastError: message, counters: this.bump("failures") }, "session_failed");
  }

  getState() { return this.getSnapshot(); }
  getSnapshot(): LucaRealtimeVoiceSessionState { return JSON.parse(JSON.stringify(this.state)); }
  subscribe(listener: RealtimeVoiceSessionListener) { this.listeners.add(listener); return () => this.unsubscribe(listener); }
  unsubscribe(listener: RealtimeVoiceSessionListener) { this.listeners.delete(listener); }
  reset() { this.apply(createInitialState()); }

  private getOrCreateTurn(): LucaRealtimeVoiceTurn {
    if (this.state.activeTurn) return this.state.activeTurn;
    return {
      turnId: `turn_${Date.now()}`,
      sessionId: this.state.sessionId ?? "unknown",
      status: "open",
      startedAt: new Date().toISOString(),
    };
  }

  private apply(state: LucaRealtimeVoiceSessionState, eventType?: LucaRealtimeVoiceEventType) {
    this.state = state;
    if (eventType) {
      this.safeCommandMeta(eventType, { status: state.status });
    }
    this.listeners.forEach((listener) => listener(this.getSnapshot()));
  }

  private bump(key: string) { return { ...this.state.counters, [key]: (this.state.counters[key] as number | undefined ?? 0) + 1 }; }
  private safeHud(fn: () => void) { try { fn(); } catch { } }
  private safeRecordTranscript(transcript: string, kind: "partial" | "final", metadata?: Record<string, unknown>) {
    try { this.options.eventBridge?.recordTranscript({ kind, transcript, sessionId: this.state.sessionId, metadata }); } catch { }
  }
  private safeOutput(kind: "tts_started" | "tts_completed" | "tts_interrupted", text: string, metadata?: Record<string, unknown>) {
    try { this.options.eventBridge?.recordOutputEvent({ kind, text, metadata }, { sessionId: this.state.sessionId }); } catch { }
  }
  private safeCommandMeta(eventType: string, metadata?: Record<string, unknown>) {
    try { this.options.eventBridge?.recordCommandResult({ status: "handled", metadata: { ...controllerMetadata, eventType, ...(metadata ?? {}) } }, { sessionId: this.state.sessionId, source: "realtime_voice_session_controller" }); } catch { }
  }
}
