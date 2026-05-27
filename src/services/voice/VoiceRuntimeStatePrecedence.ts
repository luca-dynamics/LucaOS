import { LucaRealtimeVoiceSessionState } from "./types";

export type VoiceSeverity = "idle" | "normal" | "warning" | "error";

export interface VoiceOperatorState {
  status: string;
  statusLabel: string;
  severity: VoiceSeverity;
  isListening: boolean;
  isSpeaking: boolean;
  isRecovering: boolean;
  canInterrupt: boolean;
  transcript: string;
  response: string;
  routeKind?: string | null;
  selectedProvider?: string | null;
  selectedModel?: string | null;
  routeHealth?: string | null;
  latency?: number | null;
  fallbackActive?: boolean;
  wakeWordEnabled?: boolean;
  preset?: string | null;
  sourceOfTruth: "liveService" | "diagnostics" | "realtimeBridge" | "hud" | "composed";
  metadata: Record<string, any>;
}

export interface VoiceRuntimeStatePrecedenceInput {
  liveSession?: Record<string, any>;
  diagnostics?: Record<string, any>;
  realtimeBridge?: { realtime?: LucaRealtimeVoiceSessionState; metadata?: Record<string, any> };
  hudState?: Record<string, any>;
  settings?: Record<string, any>;
}

const statusLabelMap: Record<string, string> = {
  failed: "Voice Error",
  recovering: "Voice Recovering",
  speaking: "Assistant Speaking",
  thinking: "Assistant Thinking",
  transcribing: "Transcribing",
  listening: "Listening",
  idle: "Voice Ready",
};

const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function resolveStatus(input: VoiceRuntimeStatePrecedenceInput) {
  const live = input.liveSession || {};
  const diagnostics = input.diagnostics || {};
  const realtime = input.realtimeBridge?.realtime || {};
  const hud = input.hudState || {};

  const hardError = Boolean(live.error || diagnostics.error || diagnostics.status === "ERROR" || realtime.status === "failed");
  if (hardError) return { status: "failed", source: live.error ? "liveService" : "diagnostics", reason: "hard_error" };

  const recovering = Boolean(
    live.reconnecting ||
    diagnostics.status === "RECONNECTING" ||
    diagnostics.routingHealth === "unstable" ||
    realtime.status === "recovering" ||
    hud.status === "recovering",
  );
  if (recovering) return { status: "recovering", source: diagnostics.status ? "diagnostics" : "liveService", reason: "recovery_priority" };

  if (Boolean(live.assistantSpeaking || live.audioResponseActive || live.isSpeaking)) {
    return { status: "speaking", source: "liveService", reason: "live_assistant_audio_active" };
  }

  const hasFinalTranscript = hasText(live.finalTranscript) || hasText(live.transcriptFinal) || hasText(realtime.currentTranscript) || hasText(hud.finalTranscript);
  const hasPartial = hasText(live.partialTranscript) || hasText(live.transcriptPartial) || realtime.status === "transcribing";
  if (hasFinalTranscript) return { status: "thinking", source: "liveService", reason: "final_transcript_priority" };
  if (hasPartial) return { status: "transcribing", source: "liveService", reason: "partial_transcript" };

  const listening = Boolean(live.isVadActive || live.isListening || hud.isVadActive || realtime.status === "listening" || realtime.isListening);
  if (listening) return { status: "listening", source: "liveService", reason: "vad_listening_priority" };

  return { status: "idle", source: "composed", reason: "default_idle" };
}

export function deriveVoiceOperatorState(input: VoiceRuntimeStatePrecedenceInput): VoiceOperatorState {
  const live = input.liveSession || {};
  const diagnostics = input.diagnostics || {};
  const realtime = input.realtimeBridge?.realtime || {};
  const bridgeMeta = input.realtimeBridge?.metadata || {};
  const hud = input.hudState || {};
  const voiceSettings = input.settings?.voice || input.settings || {};

  const statusResolution = resolveStatus(input);
  const status = statusResolution.status;

  const conflictingSources: string[] = [];
  if (live.status && realtime.status && String(live.status).toLowerCase() !== String(realtime.status).toLowerCase()) conflictingSources.push("live_vs_realtime");
  if (hud.status && realtime.status && String(hud.status).toLowerCase() !== String(realtime.status).toLowerCase()) conflictingSources.push("hud_vs_realtime");

  const response = (hasText(live.currentResponse) && live.currentResponse) || (hasText(hud.currentResponse) && hud.currentResponse) || (hasText(realtime.currentResponse) && realtime.currentResponse) || "";
  const transcript = (hasText(live.finalTranscript) && live.finalTranscript) || (status !== "speaking" && hasText(live.partialTranscript) && live.partialTranscript) || (hasText(hud.transcript) && hud.transcript) || (hasText(realtime.currentTranscript) && realtime.currentTranscript) || "";

  const severity: VoiceSeverity = status === "failed" ? "error" : status === "recovering" ? "warning" : status === "idle" ? "idle" : "normal";

  return {
    status,
    statusLabel: statusLabelMap[status] || "Voice",
    severity,
    isListening: status === "listening" || status === "transcribing" || Boolean(live.isVadActive || realtime.isListening),
    isSpeaking: status === "speaking" || Boolean(live.assistantSpeaking || live.audioResponseActive || realtime.isSpeaking),
    isRecovering: status === "recovering",
    canInterrupt: Boolean(live.canInterrupt ?? bridgeMeta.canInterrupt ?? realtime.canInterrupt ?? true),
    transcript,
    response,
    routeKind: live.routeKind ?? diagnostics.routeKind ?? bridgeMeta.routeKind ?? null,
    selectedProvider: live.provider ?? bridgeMeta.provider ?? null,
    selectedModel: live.model ?? bridgeMeta.model ?? null,
    routeHealth: diagnostics.routingHealth ?? bridgeMeta.routingHealth ?? null,
    latency: diagnostics.responseLatencyMs ?? bridgeMeta.latencyMs ?? null,
    fallbackActive: diagnostics.adaptiveRouteApplied ?? bridgeMeta.adaptiveFallbackActive,
    wakeWordEnabled: Boolean(voiceSettings.wakeWordEnabled),
    preset: voiceSettings.preset ?? null,
    sourceOfTruth: statusResolution.source as VoiceOperatorState["sourceOfTruth"],
    metadata: {
      conflictingSources,
      resolvedBy: statusResolution.source,
      reason: statusResolution.reason,
      liveServiceOwnership: true,
      realtimeEnrichmentOnly: true,
      diagnosticsObserved: Boolean(input.diagnostics),
      providerPolicy: live.providerPolicy ?? diagnostics.providerPolicy ?? bridgeMeta.providerPolicy ?? null,
      providerPolicyAdvisoryOnly: live.providerPolicyAdvisoryOnly ?? diagnostics.providerPolicyAdvisoryOnly ?? bridgeMeta.providerPolicyAdvisoryOnly ?? null,
      providerPolicyAppliedToRouting: live.providerPolicyAppliedToRouting ?? diagnostics.providerPolicyAppliedToRouting ?? bridgeMeta.providerPolicyAppliedToRouting ?? false,
    },
  };
}

export function getVoiceStatePrecedenceSnapshot(input: VoiceRuntimeStatePrecedenceInput) {
  const operatorState = deriveVoiceOperatorState(input);
  return {
    operatorState,
    precedence: operatorState.metadata,
    inputsPresent: {
      liveSession: Boolean(input.liveSession),
      diagnostics: Boolean(input.diagnostics),
      realtimeBridge: Boolean(input.realtimeBridge),
      hudState: Boolean(input.hudState),
      settings: Boolean(input.settings),
    },
  };
}
