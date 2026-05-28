import { BRAIN_CONFIG } from "../../config/brain.config";
import {
  denormalizeModelMode,
  hasUsableSecret,
  normalizeModelMode,
  type ModelCapability,
  type ModelMode,
  type ModelRouteDecision,
} from "../../types/modelRouting";
import {
  LOCAL_BRAIN_MODEL_IDS,
  LOCAL_EMBEDDING_MODEL_IDS,
  LOCAL_STT_MODEL_IDS,
  LOCAL_TTS_MODEL_IDS,
  type LocalModel,
  modelManager,
} from "../ModelManagerService";
import { modelReadinessResolver } from "../models/ModelReadinessResolver";
import { settingsService, type LucaSettings } from "../settingsService";
import type { OnboardingByokProvider } from "./OnboardingSetupService";

export type OnboardingModelMode = ModelMode;

export interface OnboardingRouteWarning {
  capability: ModelCapability;
  mode: ModelMode;
  provider: ModelRouteDecision["provider"];
  readiness: ModelRouteDecision["readiness"];
  reason: string;
  warnings: string[];
}

export interface OnboardingModelReadiness {
  mode: OnboardingModelMode;
  routes: Partial<Record<ModelCapability, ModelRouteDecision>>;
  warnings: OnboardingRouteWarning[];
  blocked: boolean;
  canContinue: boolean;
  recommendedLocalModels: Partial<Record<ModelCapability, LocalModel[]>>;
}

interface SettingsPort {
  getSettings(): LucaSettings;
  get<K extends keyof LucaSettings>(section: K): LucaSettings[K];
  saveSettings(settings: Partial<LucaSettings>): Promise<void> | void;
  setLocalDiscoveryOverride(enabled: boolean): void;
}

interface ReadinessResolverPort {
  resolveRoute(options: { capability: ModelCapability }): Promise<ModelRouteDecision>;
}

interface ModelManagerPort {
  getModels(): Promise<LocalModel[]>;
  getModelsByCategory(category: LocalModel["category"]): LocalModel[];
}

export interface OnboardingModelModeCoordinatorDeps {
  settings: SettingsPort;
  readinessResolver: ReadinessResolverPort;
  models: ModelManagerPort;
}

const BYOK_MODEL_BY_PROVIDER: Record<OnboardingByokProvider, string> = {
  gemini: BRAIN_CONFIG.defaults.brain,
  openai: "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-5",
  xai: "grok-beta",
};

const BYOK_KEY_FIELD: Record<OnboardingByokProvider, keyof LucaSettings["brain"]> = {
  gemini: "geminiApiKey",
  openai: "openaiApiKey",
  anthropic: "anthropicApiKey",
  xai: "xaiApiKey",
};

const CAPABILITY_CATEGORY: Record<ModelCapability, LocalModel["category"]> = {
  brain: "brain",
  chat: "brain",
  vision: "vision",
  embedding: "embedding",
  stt: "stt",
  tts: "tts",
};

function isRouteBlocked(route: ModelRouteDecision): boolean {
  return route.readiness !== "ready";
}

function toWarning(route: ModelRouteDecision): OnboardingRouteWarning {
  return {
    capability: route.capability,
    mode: route.mode,
    provider: route.provider,
    readiness: route.readiness,
    reason: route.reason,
    warnings: route.warnings,
  };
}

function uniqueRecommendedModels(models: LocalModel[]): LocalModel[] {
  const seen = new Set<string>();
  return models.filter((model) => {
    if (seen.has(model.id)) return false;
    seen.add(model.id);
    return true;
  });
}

export class OnboardingModelModeCoordinator {
  constructor(private readonly deps: OnboardingModelModeCoordinatorDeps) {}

  async selectLucaPrimeMode(): Promise<OnboardingModelReadiness> {
    const current = this.deps.settings.getSettings();
    await this.deps.settings.saveSettings({
      brain: {
        ...current.brain,
        provider: denormalizeModelMode("luca-prime"),
        useCustomApiKey: false,
        preferOllama: false,
        model: current.brain.model || BRAIN_CONFIG.defaults.brain,
        embeddingModel: current.brain.embeddingModel || BRAIN_CONFIG.defaults.embedding,
      },
      voice: {
        ...current.voice,
        provider: "gemini-genai",
        sttModel: "cloud-gemini",
      },
    });
    this.deps.settings.setLocalDiscoveryOverride(false);
    return this.getOnboardingModelReadiness({ includeVoice: false });
  }

  async selectLocalMode(): Promise<OnboardingModelReadiness> {
    this.deps.settings.setLocalDiscoveryOverride(true);
    const current = this.deps.settings.getSettings();
    const activeBrain = current.general.activeBrainId || current.brain.model;
    const activeEmbedding = current.general.activeEmbedId || current.brain.embeddingModel;
    const localBrain = LOCAL_BRAIN_MODEL_IDS.includes(activeBrain || "")
      ? activeBrain
      : LOCAL_BRAIN_MODEL_IDS[0];
    const localEmbedding = LOCAL_EMBEDDING_MODEL_IDS.includes(activeEmbedding || "")
      ? activeEmbedding
      : LOCAL_EMBEDDING_MODEL_IDS[0];

    await this.deps.settings.saveSettings({
      brain: {
        ...current.brain,
        provider: denormalizeModelMode("local"),
        useCustomApiKey: false,
        preferOllama: true,
        model: localBrain,
        embeddingModel: localEmbedding,
      },
      memory: {
        ...current.memory,
        provider: "local-luca",
        model: localEmbedding,
      },
      voice: {
        ...current.voice,
        provider: "local-luca",
        sttModel: current.voice.sttModel || LOCAL_STT_MODEL_IDS[0],
        voiceId: current.voice.voiceId || LOCAL_TTS_MODEL_IDS[0],
      },
    });

    try {
      await this.deps.models.getModels();
    } catch (error) {
      console.warn("[OnboardingModelModeCoordinator] Local model refresh failed", error);
    }

    return this.getOnboardingModelReadiness({ includeVoice: false });
  }

  async selectByokMode(options: {
    provider: OnboardingByokProvider;
    apiKey?: string;
  }): Promise<OnboardingModelReadiness> {
    const current = this.deps.settings.getSettings();
    const nextBrain: LucaSettings["brain"] = {
      ...current.brain,
      provider: denormalizeModelMode("byok"),
      useCustomApiKey: true,
      preferOllama: false,
      model: BYOK_MODEL_BY_PROVIDER[options.provider],
    };

    if (hasUsableSecret(options.apiKey)) {
      (nextBrain as any)[BYOK_KEY_FIELD[options.provider]] = options.apiKey.trim();
    }

    await this.deps.settings.saveSettings({
      brain: nextBrain,
      voice: {
        ...current.voice,
        provider: options.provider === "openai" ? "openai" : "gemini-genai",
        sttModel: options.provider === "openai" ? "openai-whisper" : "cloud-gemini",
      },
    });
    this.deps.settings.setLocalDiscoveryOverride(false);
    return this.getOnboardingModelReadiness({ includeVoice: false });
  }

  async getOnboardingModelReadiness(options: {
    includeVoice?: boolean;
    includeEmbedding?: boolean;
  } = {}): Promise<OnboardingModelReadiness> {
    const capabilities: ModelCapability[] = ["chat"];
    if (options.includeVoice) capabilities.push("stt", "tts");
    if (options.includeEmbedding !== false) capabilities.push("embedding");

    const routeEntries = await Promise.all(
      capabilities.map(async (capability) => [
        capability,
        await this.deps.readinessResolver.resolveRoute({ capability }),
      ] as const),
    );
    const routes = Object.fromEntries(routeEntries) as Partial<
      Record<ModelCapability, ModelRouteDecision>
    >;
    const warnings = routeEntries
      .map(([, route]) => route)
      .filter(isRouteBlocked)
      .map(toWarning);

    return {
      mode: normalizeModelMode(this.deps.settings.get("brain").provider),
      routes,
      warnings,
      blocked: warnings.length > 0,
      canContinue: true,
      recommendedLocalModels: this.getRecommendedLocalModelsForHardware(),
    };
  }

  async confirmSelectedModelRoute(options: {
    voiceSelected?: boolean;
    memoryEnabled?: boolean;
  } = {}): Promise<OnboardingModelReadiness> {
    const readiness = await this.getOnboardingModelReadiness({
      includeVoice: options.voiceSelected,
      includeEmbedding: options.memoryEnabled !== false,
    });
    await this.persistRouteWarnings(readiness.warnings);
    return readiness;
  }

  getRecommendedLocalModelsForHardware(): Partial<Record<ModelCapability, LocalModel[]>> {
    const pick = (capability: ModelCapability, fallbackIds: string[]) => {
      const models = this.deps.models.getModelsByCategory(CAPABILITY_CATEGORY[capability]);
      const safe = models.filter(
        (model) =>
          ["verified", "installable"].includes(model.catalogStatus || "verified") &&
          model.status !== "unsupported" &&
          model.catalogStatus !== "planned" &&
          model.catalogStatus !== "experimental",
      );
      const fallbacks = fallbackIds
        .map((id) => models.find((model) => model.id === id))
        .filter(Boolean) as LocalModel[];
      return uniqueRecommendedModels([...safe, ...fallbacks]).slice(0, 3);
    };

    return {
      chat: pick("chat", LOCAL_BRAIN_MODEL_IDS),
      brain: pick("brain", LOCAL_BRAIN_MODEL_IDS),
      stt: pick("stt", LOCAL_STT_MODEL_IDS),
      tts: pick("tts", LOCAL_TTS_MODEL_IDS),
      embedding: pick("embedding", LOCAL_EMBEDDING_MODEL_IDS),
    };
  }

  private async persistRouteWarnings(warnings: OnboardingRouteWarning[]) {
    const current = this.deps.settings.getSettings();
    await this.deps.settings.saveSettings({
      onboarding: {
        ...(current as any).onboarding,
        modelRouteWarnings: warnings,
        modelRouteWarningUpdatedAt: Date.now(),
      },
    } as Partial<LucaSettings>);
  }
}

export const onboardingModelModeCoordinator = new OnboardingModelModeCoordinator({
  settings: settingsService,
  readinessResolver: modelReadinessResolver,
  models: modelManager,
});
