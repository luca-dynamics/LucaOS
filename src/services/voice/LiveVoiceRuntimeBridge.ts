import { LucaRealtimeVoiceSessionState } from "./types";
import { deriveVoiceOperatorState } from "./VoiceRuntimeStatePrecedence";

type RealtimeStatus = LucaRealtimeVoiceSessionState["status"];

export interface LiveVoiceRuntimeBridgeSnapshot {
  realtime: LucaRealtimeVoiceSessionState;
  operatorState?: ReturnType<typeof deriveVoiceOperatorState>;
  metadata: {
    routeKind?: string | null;
    provider?: string | null;
    model?: string | null;
    latencyMs?: number | null;
    routingHealth?: string | null;
    adaptiveFallbackActive?: boolean;
    vadActive?: boolean;
    wakeWordEnabled?: boolean;
    personaMode?: string | null;
    responseModality?: string | null;
    preset?: "performance" | "speedster" | "balanced" | "privacy" | string | null;
    sttMode?: "local" | "cloud" | string | null;
    realtimeSessionId?: string | null;
    canInterrupt?: boolean;
    lastError?: string | null;
  };
}

const initialRealtime = (): LucaRealtimeVoiceSessionState => ({
  status: "idle",
  isListening: false,
  isSpeaking: false,
  canInterrupt: true,
  latencyBudget: {},
  counters: {},
  metadata: {
    controllerKind: "live_voice_runtime_bridge",
    microphoneApisCalled: false,
    audioOutputApisCalled: false,
    sttApisCalled: false,
    ttsApisCalled: false,
    providerApisCalled: false,
    networkApisCalled: false,
    heavyModelsLoaded: false,
    systemApisCalled: false,
    requiresExplicitOptIn: true,
  },
});

export class LiveVoiceRuntimeBridge {
  private snapshot: LiveVoiceRuntimeBridgeSnapshot = {
    realtime: initialRealtime(),
    metadata: {},
  };

  syncFromLiveSession(session: Record<string, any> = {}) {
    const nextStatus = this.resolveStatus(session);
    const partialTranscript = session.partialTranscript || session.transcriptPartial;
    const finalTranscript = session.finalTranscript || session.transcriptFinal;

    this.snapshot.realtime = {
      ...this.snapshot.realtime,
      status: nextStatus,
      isListening: nextStatus === "listening" || Boolean(session.isVadActive || session.isListening),
      isSpeaking: nextStatus === "speaking" || Boolean(session.isSpeaking),
      currentTranscript: partialTranscript || finalTranscript || this.snapshot.realtime.currentTranscript,
      currentResponse: session.currentResponse || session.responseText || this.snapshot.realtime.currentResponse,
      lastError: session.error ? String(session.error) : this.snapshot.realtime.lastError,
      sessionId: session.sessionId || this.snapshot.realtime.sessionId,
      metadata: {
        ...this.snapshot.realtime.metadata,
        source: "liveService",
      },
    };

    this.snapshot.metadata = {
      ...this.snapshot.metadata,
      routeKind: session.routeKind ?? this.snapshot.metadata.routeKind,
      provider: session.provider ?? this.snapshot.metadata.provider,
      model: session.model ?? this.snapshot.metadata.model,
      responseModality: session.responseModality ?? this.snapshot.metadata.responseModality,
      personaMode: session.persona ?? this.snapshot.metadata.personaMode,
      vadActive: session.isVadActive ?? session.isListening ?? this.snapshot.metadata.vadActive,
      realtimeSessionId: session.sessionId ?? this.snapshot.metadata.realtimeSessionId,
      canInterrupt: session.canInterrupt ?? this.snapshot.metadata.canInterrupt,
      providerPolicy: session.providerPolicy ?? this.snapshot.metadata.providerPolicy,
      providerPolicyAdvisoryOnly: session.providerPolicyAdvisoryOnly ?? this.snapshot.metadata.providerPolicyAdvisoryOnly,
      providerPolicyAppliedToRouting: session.providerPolicyAppliedToRouting ?? this.snapshot.metadata.providerPolicyAppliedToRouting,
      lastError: session.error ? String(session.error) : this.snapshot.metadata.lastError,
    };

    this.snapshot.operatorState = deriveVoiceOperatorState({ realtimeBridge: this.snapshot, liveSession: session });
    return this.getSnapshot();
  }

  syncFromDiagnostics(diagnostics: Record<string, any> = {}) {
    const orchestrator = diagnostics.orchestrator || diagnostics.voice?.orchestrator || diagnostics;
    this.snapshot.metadata = {
      ...this.snapshot.metadata,
      latencyMs: orchestrator.responseLatencyMs ?? orchestrator.latencyMs ?? this.snapshot.metadata.latencyMs,
      routingHealth: orchestrator.routingHealth ?? this.snapshot.metadata.routingHealth,
      adaptiveFallbackActive: orchestrator.adaptiveRouteApplied ?? diagnostics.adaptiveFallbackActive ?? this.snapshot.metadata.adaptiveFallbackActive,
      routeKind: orchestrator.routeKind ?? this.snapshot.metadata.routeKind,
      providerPolicy: orchestrator.providerPolicy ?? diagnostics.providerPolicy ?? diagnostics.voice?.route?.providerPolicy ?? this.snapshot.metadata.providerPolicy,
      providerPolicyAdvisoryOnly: orchestrator.providerPolicyAdvisoryOnly ?? diagnostics.providerPolicyAdvisoryOnly ?? diagnostics.voice?.route?.providerPolicyAdvisoryOnly ?? this.snapshot.metadata.providerPolicyAdvisoryOnly,
      providerPolicyAppliedToRouting: orchestrator.providerPolicyAppliedToRouting ?? diagnostics.providerPolicyAppliedToRouting ?? diagnostics.voice?.route?.providerPolicyAppliedToRouting ?? this.snapshot.metadata.providerPolicyAppliedToRouting,
    };

    if (orchestrator.status === "RECONNECTING" || orchestrator.routingHealth === "unstable") {
      this.snapshot.realtime = { ...this.snapshot.realtime, status: "recovering" };
    }

    this.snapshot.operatorState = deriveVoiceOperatorState({ realtimeBridge: this.snapshot, diagnostics: orchestrator });
    return this.getSnapshot();
  }

  syncFromVoiceHudProps(propsLike: Record<string, any> = {}) {
    const hudStatus = this.resolveStatus(propsLike);
    this.snapshot.realtime = {
      ...this.snapshot.realtime,
      status: hudStatus,
      currentTranscript: propsLike.transcript ?? this.snapshot.realtime.currentTranscript,
      isListening: propsLike.isVadActive ?? this.snapshot.realtime.isListening,
      isSpeaking: propsLike.isSpeaking ?? this.snapshot.realtime.isSpeaking,
    };
    this.snapshot.operatorState = deriveVoiceOperatorState({ realtimeBridge: this.snapshot, hudState: propsLike });
    return this.getSnapshot();
  }

  syncFromSettings(settings: Record<string, any> = {}) {
    const voice = settings.voice || settings;
    const sttModel = String(voice.sttModel || "");
    this.snapshot.metadata = {
      ...this.snapshot.metadata,
      wakeWordEnabled: Boolean(voice.wakeWordEnabled),
      preset: voice.preset || this.snapshot.metadata.preset,
      provider: voice.provider ?? this.snapshot.metadata.provider,
      model: voice.model ?? this.snapshot.metadata.model,
      sttMode: sttModel ? (sttModel.startsWith("cloud-") ? "cloud" : "local") : this.snapshot.metadata.sttMode,
      responseModality: voice.responseModality ?? this.snapshot.metadata.responseModality,
    };

    this.snapshot.operatorState = deriveVoiceOperatorState({ realtimeBridge: this.snapshot, settings: voice });
    return this.getSnapshot();
  }

  getRealtimeState() { return JSON.parse(JSON.stringify(this.snapshot.realtime)); }
  getSnapshot() { return JSON.parse(JSON.stringify(this.snapshot)); }
  reset() {
    this.snapshot = { realtime: initialRealtime(), metadata: {} };
    this.snapshot.operatorState = deriveVoiceOperatorState({ realtimeBridge: this.snapshot });
    return this.getSnapshot();
  }

  private resolveStatus(input: Record<string, any>): RealtimeStatus {
    if (input.error || input.status === "ERROR" || input.status === "FAILED") return "failed";
    if (input.reconnecting || input.status === "RECONNECTING" || input.status === "UNSTABLE" || input.status === "DISCONNECTED_RECOVERABLE") return "recovering";
    if (input.isSpeaking || input.status === "SPEAKING" || input.assistantSpeaking || input.audioResponseActive) return "speaking";
    if (input.finalTranscript || input.transcriptFinal) return "thinking";
    if (input.partialTranscript || input.transcriptPartial) return "transcribing";
    if (input.isVadActive || input.isListening || input.status === "LISTENING") return "listening";
    return "idle";
  }
}
