import { BRAIN_CONFIG } from "../../config/brain.config";
import {
  LOCAL_BRAIN_MODEL_IDS,
  LOCAL_EMBEDDING_MODEL_IDS,
  LOCAL_STT_MODEL_IDS,
  LOCAL_TTS_MODEL_IDS,
  LOCAL_VISION_MODEL_IDS,
  type LocalModel,
  modelManager,
} from "../local-models/LocalModelLibrary";
import { settingsService, type LucaSettings } from "../settingsService";
import {
  createBlockedRouteDecision,
  normalizeModelMode,
  type ModelCapability,
  type ModelFallbackPolicy,
  type ModelMode,
  type ModelProviderKind,
  type ModelReadinessState,
  type ModelRouteDecision,
} from "../../types/modelRouting";
import {
  getProviderKeyState,
  type ProviderKeyName,
} from "./ProviderKeyService";

export interface ModelReadinessSnapshot {
  settings: LucaSettings;
  localModel?: Pick<
    LocalModel,
    | "id"
    | "status"
    | "runtime"
    | "ollamaTag"
    | "unsupportedReason"
    | "vramWarning"
    | "policyReason"
  > & {
    catalogStatus?: LocalModel["catalogStatus"];
    catalogWarning?: string;
  };
  localRuntimeAvailable?: boolean;
  hardwareSupported?: boolean;
  keyStates?: Partial<
    Record<
      ProviderKeyName,
      { hasKey: boolean; source: ModelRouteDecision["keySource"] }
    >
  >;
}

export interface ResolveRouteOptions {
  capability: ModelCapability;
  fallbackPolicy?: ModelFallbackPolicy;
  requestedModel?: string;
}

const CAPABILITY_CATEGORY: Record<ModelCapability, LocalModel["category"]> = {
  brain: "brain",
  chat: "brain",
  vision: "vision",
  embedding: "embedding",
  stt: "stt",
  tts: "tts",
};

function chooseLocalModelId(
  settings: LucaSettings,
  capability: ModelCapability,
  requestedModel?: string,
): string {
  if (requestedModel) return requestedModel;
  const brain = settings.brain;
  const voice = settings.voice;
  switch (capability) {
    case "vision":
      return brain.visionModel;
    case "embedding":
      return brain.embeddingModel || brain.memoryModel;
    case "stt":
      return voice.sttModel;
    case "tts":
      return voice.voiceId || brain.voiceModel;
    case "brain":
    case "chat":
    default:
      return settings.general.activeBrainId || brain.model;
  }
}

function choosePrimeModel(
  settings: LucaSettings,
  capability: ModelCapability,
  requestedModel?: string,
): string {
  if (requestedModel) return requestedModel;
  if (capability === "vision")
    return settings.brain.visionModel || BRAIN_CONFIG.defaults.vision;
  if (capability === "embedding")
    return settings.brain.embeddingModel || BRAIN_CONFIG.defaults.embedding;
  if (capability === "tts")
    return (
      settings.brain.voiceModel ||
      settings.brain.model ||
      BRAIN_CONFIG.defaults.voice
    );
  if (capability === "stt") return settings.voice.sttModel || "cloud-gemini";
  return settings.brain.model || BRAIN_CONFIG.defaults.brain;
}

function selectedByokProvider(
  settings: LucaSettings,
  capability: ModelCapability,
): ModelProviderKind {
  if (capability === "tts") {
    if (
      settings.voice.provider === "openai" ||
      settings.voice.provider === "deepgram" ||
      settings.voice.provider === "google" ||
      settings.voice.provider === "gemini-genai"
    ) {
      return settings.voice.provider === "gemini-genai"
        ? "gemini"
        : settings.voice.provider;
    }
  }
  if (capability === "stt") {
    const sttModel = settings.voice.sttModel.toLowerCase();
    if (sttModel.includes("deepgram")) return "deepgram";
    if (sttModel.includes("whisper") || sttModel.includes("openai"))
      return "openai";
    if (sttModel.includes("groq")) return "groq";
    if (sttModel.includes("gemini")) return "gemini";
  }
  const model = settings.brain.model.toLowerCase();
  if (model.includes("claude")) return "anthropic";
  if (
    model.includes("gpt") ||
    model.includes("openai") ||
    model.startsWith("o1")
  )
    return "openai";
  if (model.includes("groq") || model.includes("llama3-")) return "groq";
  if (model.includes("deepseek")) return "deepseek";
  if (model.includes("grok") || model.includes("xai")) return "xai";
  if (model.includes("openrouter")) return "openrouter";
  return "gemini";
}

function keyNameForProvider(
  provider: ModelProviderKind,
): ProviderKeyName | null {
  if (provider === "luca-prime") return "gemini";
  if (
    [
      "gemini",
      "openai",
      "anthropic",
      "groq",
      "deepseek",
      "xai",
      "openrouter",
      "deepgram",
      "google",
    ].includes(provider)
  ) {
    return provider as ProviderKeyName;
  }
  return null;
}

function readinessFromLocalModel(
  model: ModelReadinessSnapshot["localModel"],
  runtimeAvailable: boolean | undefined,
): ModelReadinessState {
  if (!runtimeAvailable) return "missing_runtime";
  if (!model) return "missing_model";
  if (model.status === "ready") return "ready";
  if (model.status === "downloading") return "downloading";
  if (model.status === "unsupported") return "unsupported_hardware";
  if (model.status === "error") return "error";
  if (
    model.catalogStatus === "planned" ||
    model.catalogStatus === "experimental" ||
    model.catalogStatus === "unknown"
  )
    return "planned";
  return "missing_model";
}

export function resolveModelRouteFromSnapshot(
  snapshot: ModelReadinessSnapshot,
  options: ResolveRouteOptions,
): ModelRouteDecision {
  const { settings } = snapshot;
  const capability = options.capability;
  const mode = normalizeModelMode(settings.brain.provider);
  const fallbackPolicy =
    options.fallbackPolicy ||
    (mode === "local"
      ? "no_fallback"
      : mode === "byok"
        ? "byok_to_prime"
        : "prime_to_local");

  if (mode === "local") {
    const localModelId = chooseLocalModelId(
      settings,
      capability,
      options.requestedModel,
    );
    const localModel = snapshot.localModel;
    const provider: ModelProviderKind =
      localModel?.runtime === "ollama" ? "ollama" : "cortex";
    const readiness = readinessFromLocalModel(
      localModel,
      snapshot.localRuntimeAvailable,
    );
    const warnings = [
      localModel?.catalogWarning,
      localModel?.vramWarning,
      localModel?.policyReason,
      localModel?.unsupportedReason,
    ].filter(Boolean) as string[];
    return {
      capability,
      provider,
      model: localModel?.ollamaTag || localModelId,
      mode: "local",
      localModelId,
      runtime: provider,
      readiness,
      warnings,
      fallbackPolicy,
      privacy: "local_only",
      networkAllowed: false,
      reason:
        readiness === "ready"
          ? `Local ${capability} model is ready.`
          : readiness === "missing_runtime"
            ? `Local ${provider === "ollama" ? "Ollama" : "Cortex"} runtime is not available.`
            : readiness === "planned"
              ? `Local model ${localModelId} is planned or experimental and is not verified as installed.`
              : `Local ${capability} model ${localModelId} is not ready.`,
    };
  }

  if (mode === "byok") {
    const provider = selectedByokProvider(settings, capability);
    const keyName = keyNameForProvider(provider);
    const keyState = keyName ? snapshot.keyStates?.[keyName] : undefined;
    const hasKey = keyState?.hasKey === true;
    const model =
      options.requestedModel ||
      (capability === "tts"
        ? settings.voice.voiceModel || settings.brain.voiceModel
        : settings.brain.model);
    return {
      capability,
      provider,
      model,
      mode: "byok",
      runtime: "cloud",
      readiness: hasKey ? "ready" : "missing_key",
      warnings: hasKey
        ? []
        : [
            `${provider} BYOK key is missing or still redacted without a vault entry.`,
          ],
      fallbackPolicy,
      privacy: "user_key_cloud",
      networkAllowed: hasKey,
      keySource: hasKey ? keyState?.source || "settings" : "none",
      reason: hasKey
        ? `BYOK ${provider} route is ready for ${capability}.`
        : `BYOK ${provider} route requires a vault-backed key before cloud calls are allowed.`,
    };
  }

  const keyState = snapshot.keyStates?.gemini;
  const hasManagedKey = keyState?.hasKey !== false;
  return {
    capability,
    provider: "luca-prime",
    model: choosePrimeModel(settings, capability, options.requestedModel),
    mode: "luca-prime",
    runtime: "cloud",
    readiness: hasManagedKey ? "ready" : "missing_key",
    warnings: hasManagedKey
      ? []
      : ["Luca Prime managed cloud key is unavailable in this environment."],
    fallbackPolicy,
    privacy: "cloud_managed",
    networkAllowed: hasManagedKey,
    keySource: keyState?.source || "environment",
    reason: hasManagedKey
      ? `Luca Prime managed cloud route is ready for ${capability}.`
      : "Luca Prime requires a managed Gemini key before network calls are allowed.",
  };
}

class ModelReadinessResolver {
  async resolveRoute(
    options: ResolveRouteOptions,
  ): Promise<ModelRouteDecision> {
    const settings = settingsService.getSettings();
    const mode = normalizeModelMode(settings.brain.provider);
    const localModelId = chooseLocalModelId(
      settings,
      options.capability,
      options.requestedModel,
    );
    const localModel = this.findLocalModel(localModelId, options.capability);
    const localRuntimeAvailable =
      mode === "local"
        ? await this.isLocalRuntimeAvailable(localModel)
        : undefined;
    const keyStates: ModelReadinessSnapshot["keyStates"] = {};

    if (mode === "luca-prime") {
      keyStates.gemini = await getProviderKeyState("gemini", settings, {
        allowEnvironmentFallback: true,
      });
    } else if (mode === "byok") {
      const provider = selectedByokProvider(settings, options.capability);
      const keyName = keyNameForProvider(provider);
      if (keyName)
        keyStates[keyName] = await getProviderKeyState(keyName, settings, {
          allowEnvironmentFallback: false,
        });
    }

    return resolveModelRouteFromSnapshot(
      { settings, localModel, localRuntimeAvailable, keyStates },
      options,
    );
  }

  async resolveVoiceRoutes(): Promise<{
    stt: ModelRouteDecision;
    tts: ModelRouteDecision;
  }> {
    const [stt, tts] = await Promise.all([
      this.resolveRoute({ capability: "stt" }),
      this.resolveRoute({ capability: "tts" }),
    ]);
    return { stt, tts };
  }

  private findLocalModel(
    modelId: string,
    capability: ModelCapability,
  ): ModelReadinessSnapshot["localModel"] {
    const normalizedId = modelId.replace(/^local\//, "");
    const model = modelManager.getModel(normalizedId);
    if (model) return model;

    const category = CAPABILITY_CATEGORY[capability];
    const candidates = modelManager.getModelsByCategory(category);
    return (
      candidates.find((candidate) => candidate.status === "ready") ||
      candidates[0]
    );
  }

  private async isLocalRuntimeAvailable(
    model?: ModelReadinessSnapshot["localModel"],
  ): Promise<boolean> {
    if (!model) return false;
    if (model.runtime === "ollama") {
      const status = await modelManager.getOllamaModels();
      return status.available;
    }
    // Internal local models (vision/STT/TTS/some brains) depend on Cortex,
    // not a hard-coded alternate port.
    try {
      const { probeCortexViaRuntimeFacade } = await import(
        "../local-models/cortexRuntimeProbe"
      );
      const probe = await probeCortexViaRuntimeFacade();
      return probe.available;
    } catch {
      return false;
    }
  }
}

export const modelReadinessResolver = new ModelReadinessResolver();
export {
  LOCAL_BRAIN_MODEL_IDS,
  LOCAL_VISION_MODEL_IDS,
  LOCAL_TTS_MODEL_IDS,
  LOCAL_STT_MODEL_IDS,
  LOCAL_EMBEDDING_MODEL_IDS,
};
