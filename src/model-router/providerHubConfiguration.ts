import type { LucaSettings } from "../services/settingsService";
import type { LucaProviderHubId } from "./providerHubRegistry";

export interface ProviderHubConfigurationDraft {
  readonly providerId: LucaProviderHubId;
  readonly apiKey?: string;
  readonly baseUrl?: string;
  readonly modelId?: string;
  readonly enabled?: boolean;
}

export const PROVIDER_HUB_SECRET_SENTINEL = "[SECURED]";

export const providerHubApiKeyField: Partial<Record<LucaProviderHubId, keyof LucaSettings["brain"]>> = {
  openai: "openaiApiKey",
  anthropic: "anthropicApiKey",
  google_gemini: "geminiApiKey",
  xai_grok: "xaiApiKey",
  deepseek: "deepseekApiKey",
  groq: "groqApiKey",
  openrouter: "openRouterApiKey",
  custom_openai_compatible: "customOpenAiCompatibleApiKey",
};

export const providerHubBaseUrlField: Partial<Record<LucaProviderHubId, keyof LucaSettings["brain"]>> = {
  openai: "openaiBaseUrl",
  anthropic: "anthropicBaseUrl",
  google_gemini: "geminiBaseUrl",
  xai_grok: "xaiBaseUrl",
  deepseek: "deepseekBaseUrl",
  groq: "groqBaseUrl",
  custom_openai_compatible: "customOpenAiCompatibleBaseUrl",
  ollama: "ollamaBaseUrl",
  lm_studio: "lmStudioBaseUrl",
};

export function getProviderHubApiKeyPresence(settings: LucaSettings, providerId: LucaProviderHubId): boolean {
  const field = providerHubApiKeyField[providerId];
  const value = field ? settings.brain[field] : undefined;
  return typeof value === "string" && value.trim().length > 0;
}

export function getProviderHubSafeKeyStatus(settings: LucaSettings, providerId: LucaProviderHubId): "API key saved" | "Missing API key" | "No user key required" {
  if (!providerHubApiKeyField[providerId]) return "No user key required";
  return getProviderHubApiKeyPresence(settings, providerId) ? "API key saved" : "Missing API key";
}

export function createProviderHubSettingsPatch(settings: LucaSettings, draft: ProviderHubConfigurationDraft): Partial<LucaSettings> {
  const brainPatch: Partial<LucaSettings["brain"]> = {};
  const providerHubPatch = { ...(settings.providerHub ?? {}) };
  const disabledProviderIds = new Set(providerHubPatch.disabledProviderIds ?? []);

  const apiKeyField = providerHubApiKeyField[draft.providerId];
  if (apiKeyField && typeof draft.apiKey === "string" && draft.apiKey.trim().length > 0) {
    (brainPatch as any)[apiKeyField] = draft.apiKey.trim();
  }

  const baseUrlField = providerHubBaseUrlField[draft.providerId];
  if (baseUrlField && typeof draft.baseUrl === "string") {
    (brainPatch as any)[baseUrlField] = draft.baseUrl.trim();
  }

  if (typeof draft.modelId === "string" && draft.modelId.trim().length > 0) {
    const modelId = draft.modelId.trim();
    if (draft.providerId === "custom_openai_compatible") {
      brainPatch.customOpenAiCompatibleModel = modelId;
    } else {
      brainPatch.model = modelId;
    }
  }

  if (typeof draft.enabled === "boolean") {
    if (draft.enabled) disabledProviderIds.delete(draft.providerId);
    else disabledProviderIds.add(draft.providerId);
    providerHubPatch.disabledProviderIds = [...disabledProviderIds];
  }

  return {
    brain: brainPatch as LucaSettings["brain"],
    providerHub: providerHubPatch,
  };
}

export function serializeProviderHubConfigurationSafely(input: unknown): string {
  return JSON.stringify(input, (_key, value) => {
    if (typeof value === "string" && /sk-|secret|token|api[_-]?key/i.test(value)) return PROVIDER_HUB_SECRET_SENTINEL;
    return value;
  });
}
