import type {
  PresenceVoiceActivityEvent,
  PresenceVoiceLegacyFields,
  PresenceVoiceRouteEnvelope,
  PresenceVoiceRouteStatus,
  PresenceVoiceToggleRequest,
  PresenceVoiceTranscriptEvent,
} from "./presenceVoiceTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clonePayload<T extends PresenceVoiceLegacyFields>(payload: unknown): T {
  return (isRecord(payload) ? { ...payload } : {}) as T;
}

export function createPresenceVoiceToggleRequest(payload: unknown = {}): PresenceVoiceToggleRequest {
  return clonePayload<PresenceVoiceToggleRequest>(payload);
}

export function createPresenceVoiceTranscriptEvent(payload: unknown = {}): PresenceVoiceTranscriptEvent {
  return clonePayload<PresenceVoiceTranscriptEvent>(payload);
}

export function createPresenceVoiceActivityEvent(payload: unknown = {}): PresenceVoiceActivityEvent {
  return clonePayload<PresenceVoiceActivityEvent>(payload);
}

export function createPresenceVoiceRouteEnvelope(payload: unknown = {}): PresenceVoiceRouteEnvelope {
  const envelope = clonePayload<PresenceVoiceRouteEnvelope>(payload);
  if (isRecord(envelope.payload)) {
    return { ...envelope, payload: clonePayload(envelope.payload) };
  }
  return envelope;
}

export function getPresenceVoiceTranscript(payload: unknown): string {
  if (!isRecord(payload)) return "";
  return typeof payload.transcript === "string" ? payload.transcript : "";
}

export function isPresenceVadActive(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  return payload.isVadActive === true;
}

export function getPresenceVoiceStatus(payload: unknown): PresenceVoiceRouteStatus | undefined {
  if (!isRecord(payload)) return undefined;
  return typeof payload.status === "string" ? payload.status as PresenceVoiceRouteStatus : undefined;
}

export function isPresenceVoiceListening(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  return payload.isListening === true || payload.isVadActive === true || payload.status === "listening";
}

export function toLegacyVoiceTogglePayload(
  voice: PresenceVoiceToggleRequest,
  legacyPayload: PresenceVoiceLegacyFields = {},
): PresenceVoiceLegacyFields {
  return { ...legacyPayload, ...createPresenceVoiceToggleRequest(voice) };
}

export function toLegacyVoiceUpdatePayload(
  voice: PresenceVoiceLegacyFields,
  legacyPayload: PresenceVoiceLegacyFields = {},
): PresenceVoiceLegacyFields {
  const normalized = createPresenceVoiceActivityEvent(voice);
  return {
    ...legacyPayload,
    ...normalized,
    ...(voice.transcript !== undefined ? { transcript: voice.transcript } : {}),
    ...(voice.transcriptSource !== undefined ? { transcriptSource: voice.transcriptSource } : {}),
    ...(voice.isListening !== undefined ? { isListening: voice.isListening } : {}),
    ...(voice.isVadActive !== undefined ? { isVadActive: voice.isVadActive } : {}),
    ...(voice.isSpeaking !== undefined ? { isSpeaking: voice.isSpeaking } : {}),
    ...(voice.amplitude !== undefined ? { amplitude: voice.amplitude } : {}),
    ...(voice.status !== undefined ? { status: voice.status } : {}),
  };
}
