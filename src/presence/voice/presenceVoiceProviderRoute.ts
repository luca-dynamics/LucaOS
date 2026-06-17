import type {
  PresenceVoiceProviderFallback,
  PresenceVoiceProviderFallbackReason,
  PresenceVoiceProviderHealth,
  PresenceVoiceProviderId,
  PresenceVoiceProviderLegacyFields,
  PresenceVoiceProviderRouteDecision,
  PresenceVoiceProviderRouteEnvelope,
} from "./presenceVoiceProviderTypes";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clonePayload<T extends PresenceVoiceProviderLegacyFields>(payload: unknown): T {
  return (isRecord(payload) ? { ...payload } : {}) as T;
}

function cloneProviderList(value: unknown): Array<PresenceVoiceProviderId | PresenceVoiceProviderHealth> | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((provider) => (isRecord(provider) ? { ...provider } as PresenceVoiceProviderHealth : provider as PresenceVoiceProviderId));
}

export function createVoiceProviderHealth(payload: unknown = {}): PresenceVoiceProviderHealth {
  const health = clonePayload<PresenceVoiceProviderHealth>(payload);
  if (Array.isArray(health.capabilities)) {
    health.capabilities = [...health.capabilities];
  }
  if (isRecord(health.metadata)) {
    health.metadata = { ...health.metadata };
  }
  return health;
}

export function createVoiceProviderFallback(payload: unknown = {}): PresenceVoiceProviderFallback {
  const fallback = clonePayload<PresenceVoiceProviderFallback>(payload);
  const attemptedProviders = cloneProviderList(fallback.attemptedProviders);
  if (attemptedProviders) fallback.attemptedProviders = attemptedProviders;
  if (isRecord(fallback.fallbackFrom)) fallback.fallbackFrom = { ...fallback.fallbackFrom } as PresenceVoiceProviderHealth;
  if (isRecord(fallback.fallbackTo)) fallback.fallbackTo = { ...fallback.fallbackTo } as PresenceVoiceProviderHealth;
  if (isRecord(fallback.selectedProvider)) fallback.selectedProvider = { ...fallback.selectedProvider } as PresenceVoiceProviderHealth;
  if (isRecord(fallback.metadata)) fallback.metadata = { ...fallback.metadata };
  return fallback;
}

export function createVoiceProviderRouteDecision(payload: unknown = {}): PresenceVoiceProviderRouteDecision {
  const decision = createVoiceProviderFallback(payload) as PresenceVoiceProviderRouteDecision;
  if (isRecord(decision.fallback)) decision.fallback = createVoiceProviderFallback(decision.fallback);
  return decision;
}

export function createVoiceProviderRouteEnvelope(payload: unknown = {}): PresenceVoiceProviderRouteEnvelope {
  const envelope = clonePayload<PresenceVoiceProviderRouteEnvelope>(payload);
  if (isRecord(envelope.payload)) envelope.payload = { ...envelope.payload };
  const attemptedProviders = cloneProviderList(envelope.attemptedProviders);
  if (attemptedProviders) envelope.attemptedProviders = attemptedProviders;
  if (isRecord(envelope.selectedProvider)) envelope.selectedProvider = { ...envelope.selectedProvider } as PresenceVoiceProviderHealth;
  if (isRecord(envelope.metadata)) envelope.metadata = { ...envelope.metadata };
  return envelope;
}

export function getVoiceProviderFallbackReason(payload: unknown): PresenceVoiceProviderFallbackReason | undefined {
  if (!isRecord(payload)) return undefined;
  if (typeof payload.fallbackReason === "string") return payload.fallbackReason as PresenceVoiceProviderFallbackReason;
  if (isRecord(payload.fallback) && typeof payload.fallback.fallbackReason === "string") {
    return payload.fallback.fallbackReason as PresenceVoiceProviderFallbackReason;
  }
  return undefined;
}

export function getSelectedVoiceProvider(payload: unknown): PresenceVoiceProviderId | PresenceVoiceProviderHealth | undefined {
  if (!isRecord(payload)) return undefined;
  if (payload.selectedProvider !== undefined) {
    return isRecord(payload.selectedProvider) ? { ...payload.selectedProvider } as PresenceVoiceProviderHealth : payload.selectedProvider as PresenceVoiceProviderId;
  }
  if (typeof payload.providerId === "string") return payload.providerId;
  return undefined;
}

export function isVoiceProviderAvailable(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  const status = typeof payload.status === "string" ? payload.status : typeof payload.health === "string" ? payload.health : undefined;
  return status === "available" || status === "ready";
}

export function shouldFallbackVoiceProvider(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  if (payload.shouldFallback === true) return true;
  if (getVoiceProviderFallbackReason(payload)) return true;
  const status = typeof payload.status === "string" ? payload.status : typeof payload.health === "string" ? payload.health : undefined;
  return status === "unavailable" || status === "degraded" || status === "error" || status === "offline";
}

export function mergeVoiceProviderHealth(
  prev: PresenceVoiceProviderHealth | undefined,
  next: PresenceVoiceProviderHealth | undefined,
): PresenceVoiceProviderHealth {
  return {
    ...createVoiceProviderHealth(prev),
    ...createVoiceProviderHealth(next),
  };
}
