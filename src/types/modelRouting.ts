export type LucaSettingsBrainProvider = "local-luca" | "cloud-managed" | "byok";

export type ModelMode = "luca-prime" | "local" | "byok";

export type ModelProviderKind =
  | "luca-prime"
  | "gemini"
  | "openai"
  | "anthropic"
  | "groq"
  | "deepseek"
  | "xai"
  | "openrouter"
  | "ollama"
  | "cortex"
  | "local"
  | "deepgram"
  | "google";

export type ModelCapability =
  | "brain"
  | "chat"
  | "vision"
  | "embedding"
  | "stt"
  | "tts";

export type ModelReadinessState =
  | "ready"
  | "missing_key"
  | "missing_runtime"
  | "missing_model"
  | "unsupported_hardware"
  | "downloading"
  | "planned"
  | "unknown"
  | "error";

export type ModelPrivacyPosture =
  | "local_only"
  | "cloud_managed"
  | "user_key_cloud"
  | "mixed";

export type ModelFallbackPolicy =
  | "no_fallback"
  | "local_to_prime"
  | "byok_to_prime"
  | "prime_to_local"
  | "safe_default";

export interface ModelRouteDecision {
  capability: ModelCapability;
  provider: ModelProviderKind;
  model: string;
  mode: ModelMode;
  reason: string;
  warnings: string[];
  readiness: ModelReadinessState;
  privacy: ModelPrivacyPosture;
  fallbackPolicy: ModelFallbackPolicy;
  networkAllowed: boolean;
  keySource?: "vault" | "settings" | "environment" | "none";
  runtime?: "ollama" | "cortex" | "cloud" | "browser";
  localModelId?: string;
}

const SETTINGS_PROVIDER_TO_MODE: Record<LucaSettingsBrainProvider, ModelMode> =
  {
    "local-luca": "local",
    "cloud-managed": "luca-prime",
    byok: "byok",
  };

export function normalizeModelMode(provider?: string | null): ModelMode {
  if (provider && provider in SETTINGS_PROVIDER_TO_MODE) {
    return SETTINGS_PROVIDER_TO_MODE[provider as LucaSettingsBrainProvider];
  }
  return "local";
}

export function denormalizeModelMode(
  mode: ModelMode,
): LucaSettingsBrainProvider {
  if (mode === "luca-prime") return "cloud-managed";
  return mode === "byok" ? "byok" : "local-luca";
}

export function isRedactedSecret(value: unknown): boolean {
  return typeof value === "string" && value.trim() === "[SECURED]";
}

export function hasUsableSecret(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !isRedactedSecret(value)
  );
}

export function createBlockedRouteDecision(input: {
  capability: ModelCapability;
  provider: ModelProviderKind;
  model: string;
  mode: ModelMode;
  readiness: ModelReadinessState;
  reason: string;
  warnings?: string[];
  privacy: ModelPrivacyPosture;
  fallbackPolicy?: ModelFallbackPolicy;
  networkAllowed?: boolean;
  keySource?: ModelRouteDecision["keySource"];
  runtime?: ModelRouteDecision["runtime"];
  localModelId?: string;
}): ModelRouteDecision {
  return {
    fallbackPolicy: "no_fallback",
    networkAllowed: false,
    warnings: [],
    ...input,
  };
}
