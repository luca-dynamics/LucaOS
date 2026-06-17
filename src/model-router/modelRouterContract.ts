export type LucaModelRouteMode =
  | "luca_prime"
  | "local"
  | "byok"
  | "auto"
  | "offline";

export type LucaModelTaskType =
  | "chat"
  | "voice_stt"
  | "voice_tts"
  | "vision"
  | "memory"
  | "embedding"
  | "code"
  | "tool_planning"
  | "long_context"
  | "fast_reply"
  | "private_local";

export type LucaModelProviderType =
  | "luca_cloud"
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "openrouter"
  | "mistral"
  | "deepseek"
  | "groq"
  | "together"
  | "fireworks"
  | "perplexity"
  | "ollama"
  | "local_runtime"
  | "byok"
  | "disabled"
  | "unknown";

export type LucaModelCapability =
  | "text_generation"
  | "streaming"
  | "vision"
  | "speech_to_text"
  | "text_to_speech"
  | "embedding"
  | "tool_calling"
  | "code_generation"
  | "long_context"
  | "local_only";

export type LucaModelFit = "unknown" | "pass" | "warning" | "fail";
export type LucaModelCostTier = "unknown" | "free" | "low" | "medium" | "high";

export interface LucaModelHardwareProfile {
  readonly deviceClass: "unknown" | "mobile" | "desktop" | "workstation";
  readonly ramBytes?: number;
  readonly vramBytes?: number;
  readonly gpuVendor?: string;
  readonly cpuArch?: string;
  readonly offlineRuntimeAvailable?: boolean;
}

export interface LucaModelFallbackPolicy {
  readonly allowed: boolean;
  readonly policy:
    | "none"
    | "safe_default"
    | "local_to_luca_prime"
    | "byok_to_luca_prime"
    | "luca_prime_to_local"
    | "provider_compatibility_alias";
  readonly requiresUserApproval: boolean;
  readonly reason?: string;
}

export interface LucaModelRouteTrace {
  readonly requestedTaskType: LucaModelTaskType;
  readonly selectedRouteMode: LucaModelRouteMode;
  readonly selectedProviderType: LucaModelProviderType;
  readonly selectedModelId?: string;
  readonly fallbackUsed: boolean;
  readonly fallbackReason?: string;
  readonly privacyFit: LucaModelFit;
  readonly hardwareFit: LucaModelFit;
  readonly latencyFit: LucaModelFit;
  readonly costTier: LucaModelCostTier;
  readonly requiresApproval: boolean;
  readonly requiresDownload: boolean;
  readonly requiresUserKey: boolean;
  readonly sideEffectsPerformed: false;
}

export interface LucaModelRouteRequest {
  readonly taskType: LucaModelTaskType;
  readonly routeMode: LucaModelRouteMode;
  readonly requestedModelId?: string;
  readonly providerType?: LucaModelProviderType;
  readonly requiredCapabilities?: readonly LucaModelCapability[];
  readonly hardwareProfile?: LucaModelHardwareProfile;
  readonly fallbackPolicy?: LucaModelFallbackPolicy;
  readonly operationId?: string;
}

export interface LucaModelRouteDecision {
  readonly selectedModelId: string;
  readonly providerType: LucaModelProviderType;
  readonly routeMode: LucaModelRouteMode;
  readonly taskType: LucaModelTaskType;
  readonly capabilities: readonly LucaModelCapability[];
  readonly fallbackUsed: boolean;
  readonly fallbackReason?: string;
  readonly hardwareFit: LucaModelFit;
  readonly privacyFit: LucaModelFit;
  readonly latencyFit: LucaModelFit;
  readonly costTier: LucaModelCostTier;
  readonly requiresUserKey: boolean;
  readonly requiresDownload: boolean;
  readonly requiresApproval: boolean;
  readonly trace: LucaModelRouteTrace;
  readonly sideEffectsPerformed: false;
}

export function createStaticLucaModelRouteDecision(input: {
  readonly selectedModelId: string;
  readonly providerType: LucaModelProviderType;
  readonly routeMode: LucaModelRouteMode;
  readonly taskType: LucaModelTaskType;
  readonly capabilities?: readonly LucaModelCapability[];
  readonly fallbackUsed?: boolean;
  readonly fallbackReason?: string;
  readonly hardwareFit?: LucaModelFit;
  readonly privacyFit?: LucaModelFit;
  readonly latencyFit?: LucaModelFit;
  readonly costTier?: LucaModelCostTier;
  readonly requiresUserKey?: boolean;
  readonly requiresDownload?: boolean;
  readonly requiresApproval?: boolean;
}): LucaModelRouteDecision {
  const fallbackUsed = input.fallbackUsed ?? false;
  const hardwareFit = input.hardwareFit ?? "unknown";
  const privacyFit = input.privacyFit ?? "unknown";
  const latencyFit = input.latencyFit ?? "unknown";
  const costTier = input.costTier ?? "unknown";
  const requiresApproval = input.requiresApproval ?? false;
  const requiresDownload = input.requiresDownload ?? false;
  const requiresUserKey = input.requiresUserKey ?? false;

  return {
    selectedModelId: input.selectedModelId,
    providerType: input.providerType,
    routeMode: input.routeMode,
    taskType: input.taskType,
    capabilities: input.capabilities ?? [],
    fallbackUsed,
    fallbackReason: input.fallbackReason,
    hardwareFit,
    privacyFit,
    latencyFit,
    costTier,
    requiresUserKey,
    requiresDownload,
    requiresApproval,
    sideEffectsPerformed: false,
    trace: {
      requestedTaskType: input.taskType,
      selectedRouteMode: input.routeMode,
      selectedProviderType: input.providerType,
      selectedModelId: input.selectedModelId,
      fallbackUsed,
      fallbackReason: input.fallbackReason,
      privacyFit,
      hardwareFit,
      latencyFit,
      costTier,
      requiresApproval,
      requiresDownload,
      requiresUserKey,
      sideEffectsPerformed: false,
    },
  };
}
