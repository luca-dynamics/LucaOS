import type { PresenceVoiceStatus } from "../presenceTypes";

export type PresenceVoiceRouteStatus = PresenceVoiceStatus | "starting" | "stopping" | "fallback" | (string & {});
export type PresenceVoiceSource = "wake-word" | "voice-shortcut" | "widget" | "hologram" | "miniChat" | "dashboard" | "tray" | "manual" | "system" | (string & {});
export type PresenceVoiceMode = "TOGGLE" | "START" | "STOP" | "DICTATION" | "CONVERSATION" | "WAKE" | "HUD" | (string & {});
export type PresenceVoiceFallbackReason = "provider-error" | "model-unavailable" | "permission-denied" | "network" | "timeout" | "unknown" | (string & {});
export type PresenceVoiceTranscriptSource = "user" | "model" | (string & {});

export interface PresenceVoiceLegacyFields {
  isListening?: boolean;
  isVadActive?: boolean;
  isSpeaking?: boolean;
  transcript?: string;
  transcriptSource?: PresenceVoiceTranscriptSource;
  amplitude?: number;
  status?: PresenceVoiceRouteStatus;
  mode?: PresenceVoiceMode;
  context?: unknown;
  forceHud?: boolean;
  source?: PresenceVoiceSource;
  provider?: string;
  model?: string;
  persona?: string;
  language?: string;
  error?: string | { message?: string; [key: string]: unknown } | unknown;
  fallbackReason?: PresenceVoiceFallbackReason;
  timestamp?: number | string;
  requestId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

export interface PresenceVoiceToggleRequest extends PresenceVoiceLegacyFields {
  mode?: PresenceVoiceMode;
  source?: PresenceVoiceSource;
  forceHud?: boolean;
}

export interface PresenceVoiceTranscriptEvent extends PresenceVoiceLegacyFields {
  transcript?: string;
  transcriptSource?: PresenceVoiceTranscriptSource;
}

export interface PresenceVoiceActivityEvent extends PresenceVoiceLegacyFields {
  isListening?: boolean;
  isVadActive?: boolean;
  isSpeaking?: boolean;
  amplitude?: number;
  status?: PresenceVoiceRouteStatus;
}

export interface PresenceVoiceRouteEnvelope extends PresenceVoiceLegacyFields {
  type?: "toggle" | "transcript" | "activity" | "fallback" | "update" | (string & {});
  payload?: PresenceVoiceLegacyFields;
}
