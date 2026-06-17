import type { PresenceVoiceState, PresenceVoiceStatus } from "../presenceTypes";
import { defaultPresenceRuntimeState } from "../presenceState";
import { createPresenceVoiceActivityEvent } from "./presenceVoiceRoute";
import type { PresenceVoiceLegacyFields } from "./presenceVoiceTypes";

export type LegacyVoiceTranscriptSource = "user" | "model";

export interface PresenceVoiceDisplayViewModel {
  transcript: string;
  transcriptSource: LegacyVoiceTranscriptSource;
  isListening: boolean;
  isSpeaking: boolean;
  amplitude: number;
  status: PresenceVoiceStatus;
}

const PRESENCE_VOICE_STATUSES = new Set<PresenceVoiceStatus>([
  "idle",
  "listening",
  "thinking",
  "speaking",
  "error",
]);

export function toLegacyVoiceTranscriptSource(value: unknown): LegacyVoiceTranscriptSource {
  return value === "model" ? "model" : "user";
}

export function toPresenceVoiceDisplayStatus(
  value: unknown,
  fallback: PresenceVoiceStatus = defaultPresenceRuntimeState.voice.status,
): PresenceVoiceStatus {
  return typeof value === "string" && PRESENCE_VOICE_STATUSES.has(value as PresenceVoiceStatus)
    ? (value as PresenceVoiceStatus)
    : fallback;
}

function toPresenceVoiceDisplayViewModel(
  voice: Partial<PresenceVoiceState> | PresenceVoiceLegacyFields,
  legacyPayload: PresenceVoiceLegacyFields = {},
): PresenceVoiceDisplayViewModel {
  const normalized = createPresenceVoiceActivityEvent(voice);
  const legacy = createPresenceVoiceActivityEvent(legacyPayload);
  const fallbackStatus = toPresenceVoiceDisplayStatus(legacy.status);

  return {
    transcript: typeof normalized.transcript === "string" ? normalized.transcript : "",
    transcriptSource: toLegacyVoiceTranscriptSource(normalized.transcriptSource),
    isListening: normalized.isListening === true,
    isSpeaking: normalized.isSpeaking === true,
    amplitude: typeof normalized.amplitude === "number" ? normalized.amplitude : 0,
    status: toPresenceVoiceDisplayStatus(normalized.status, fallbackStatus),
  };
}

export function toHologramVoiceDisplayState(
  voice: Partial<PresenceVoiceState> | PresenceVoiceLegacyFields,
  legacyPayload: PresenceVoiceLegacyFields = {},
): PresenceVoiceDisplayViewModel {
  return toPresenceVoiceDisplayViewModel(voice, legacyPayload);
}

export function toWidgetDictationState(
  voice: Partial<PresenceVoiceState> | PresenceVoiceLegacyFields,
  legacyPayload: PresenceVoiceLegacyFields = {},
): PresenceVoiceDisplayViewModel {
  return toPresenceVoiceDisplayViewModel(voice, legacyPayload);
}

export function toLegacyVoiceDisplayState(
  voice: Partial<PresenceVoiceState> | PresenceVoiceLegacyFields,
  legacyPayload: PresenceVoiceLegacyFields = {},
): PresenceVoiceDisplayViewModel {
  return toPresenceVoiceDisplayViewModel(voice, legacyPayload);
}
