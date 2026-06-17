export type PresenceVoiceProviderKind =
  | "cloud"
  | "local"
  | "byok"
  | "browser"
  | "system"
  | "mock"
  | "test"
  | (string & {});

export type PresenceVoiceProviderId = string;

export type PresenceVoiceProviderStatus =
  | "unknown"
  | "available"
  | "unavailable"
  | "initializing"
  | "ready"
  | "degraded"
  | "error"
  | "offline"
  | (string & {});

export type PresenceVoiceProviderCapability =
  | "capture"
  | "transcription"
  | "speech"
  | "vad"
  | "wake-word"
  | "streaming"
  | "conversation"
  | "dictation"
  | (string & {});

export type PresenceVoiceProviderMode =
  | "cloud"
  | "local"
  | "BYOK"
  | "browser"
  | "system"
  | "mock"
  | "test"
  | (string & {});

export type PresenceVoiceProviderFallbackReason =
  | "provider-error"
  | "provider-unavailable"
  | "model-unavailable"
  | "permission-denied"
  | "network"
  | "timeout"
  | "health-check-failed"
  | "unsupported-capability"
  | "unknown"
  | (string & {});

export interface PresenceVoiceProviderLegacyFields {
  [key: string]: unknown;
}

export interface PresenceVoiceProviderHealth extends PresenceVoiceProviderLegacyFields {
  providerId?: PresenceVoiceProviderId;
  providerKind?: PresenceVoiceProviderKind;
  providerName?: string;
  model?: string;
  voice?: string;
  language?: string;
  mode?: PresenceVoiceProviderMode;
  status?: PresenceVoiceProviderStatus;
  health?: PresenceVoiceProviderStatus;
  capabilities?: PresenceVoiceProviderCapability[];
  latencyMs?: number;
  error?: string | { message?: string; [key: string]: unknown } | unknown;
  timestamp?: number | string;
  metadata?: Record<string, unknown>;
}

export interface PresenceVoiceProviderFallback extends PresenceVoiceProviderLegacyFields {
  fallbackReason?: PresenceVoiceProviderFallbackReason;
  fallbackFrom?: PresenceVoiceProviderId | PresenceVoiceProviderHealth;
  fallbackTo?: PresenceVoiceProviderId | PresenceVoiceProviderHealth;
  attemptedProviders?: Array<PresenceVoiceProviderId | PresenceVoiceProviderHealth>;
  selectedProvider?: PresenceVoiceProviderId | PresenceVoiceProviderHealth;
  providerId?: PresenceVoiceProviderId;
  providerKind?: PresenceVoiceProviderKind;
  model?: string;
  voice?: string;
  language?: string;
  mode?: PresenceVoiceProviderMode;
  error?: string | { message?: string; [key: string]: unknown } | unknown;
  sessionId?: string;
  requestId?: string;
  timestamp?: number | string;
  metadata?: Record<string, unknown>;
}

export interface PresenceVoiceProviderRouteDecision extends PresenceVoiceProviderFallback {
  selectedProvider?: PresenceVoiceProviderId | PresenceVoiceProviderHealth;
  attemptedProviders?: Array<PresenceVoiceProviderId | PresenceVoiceProviderHealth>;
  fallback?: PresenceVoiceProviderFallback;
  shouldFallback?: boolean;
  status?: PresenceVoiceProviderStatus;
  health?: PresenceVoiceProviderStatus;
  latencyMs?: number;
}

export interface PresenceVoiceProviderRouteEnvelope extends PresenceVoiceProviderLegacyFields {
  type?: "provider-health" | "provider-route" | "provider-fallback" | (string & {});
  payload?: PresenceVoiceProviderHealth | PresenceVoiceProviderRouteDecision | PresenceVoiceProviderFallback | PresenceVoiceProviderLegacyFields;
  providerId?: PresenceVoiceProviderId;
  providerKind?: PresenceVoiceProviderKind;
  selectedProvider?: PresenceVoiceProviderId | PresenceVoiceProviderHealth;
  fallbackReason?: PresenceVoiceProviderFallbackReason;
  attemptedProviders?: Array<PresenceVoiceProviderId | PresenceVoiceProviderHealth>;
  sessionId?: string;
  requestId?: string;
  timestamp?: number | string;
  metadata?: Record<string, unknown>;
}
