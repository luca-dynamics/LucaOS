import type { LucaSettings } from "../services/settingsService";
import { evaluateProviderHubReadinessForAll, type LucaProviderHubConnectionSnapshot, type LucaProviderHubReadinessResult } from "./providerHubReadiness";

export interface ProviderHubSettingsSnapshotInput {
  readonly settings: LucaSettings;
  readonly ollamaAvailable?: boolean;
  readonly lmStudioAvailable?: boolean;
  readonly internalLocalRuntimeAvailable?: boolean;
}

export function createProviderHubSettingsSnapshots(input: ProviderHubSettingsSnapshotInput): readonly LucaProviderHubConnectionSnapshot[] {
  const brain = input.settings.brain;

  return [
    { providerId: "luca_prime", enabled: true, configuredModelId: brain.provider === "cloud-managed" ? brain.model : undefined },
    { providerId: "openai", hasUserKey: Boolean(brain.openaiApiKey), configuredModelId: brain.model?.includes("gpt") ? brain.model : undefined },
    { providerId: "anthropic", hasUserKey: Boolean(brain.anthropicApiKey), configuredModelId: brain.model?.includes("claude") ? brain.model : undefined },
    { providerId: "google_gemini", hasUserKey: Boolean(brain.geminiApiKey), configuredModelId: brain.model?.includes("gemini") ? brain.model : undefined },
    { providerId: "xai_grok", hasUserKey: Boolean(brain.xaiApiKey), configuredModelId: brain.model?.includes("grok") ? brain.model : undefined },
    { providerId: "deepseek", hasUserKey: Boolean(brain.deepseekApiKey), configuredModelId: brain.model?.includes("deepseek") ? brain.model : undefined },
    { providerId: "groq", hasUserKey: Boolean(brain.groqApiKey), configuredModelId: brain.model?.includes("groq") ? brain.model : undefined },
    { providerId: "openrouter", hasUserKey: Boolean(brain.openRouterApiKey) },
    { providerId: "ollama", localRuntimeAvailable: Boolean(input.ollamaAvailable), configuredModelId: input.settings.general.activeBrainId || undefined },
    { providerId: "lm_studio", localRuntimeAvailable: Boolean(input.lmStudioAvailable) },
    { providerId: "local_runtime", localRuntimeAvailable: Boolean(input.internalLocalRuntimeAvailable) },
    {
      providerId: "custom_openai_compatible",
      hasUserKey: Boolean(brain.useCustomApiKey && brain.openaiApiKey),
      hasCustomBaseUrl: Boolean(brain.openaiBaseUrl),
      configuredModelId: brain.useCustomApiKey ? brain.model : undefined,
    },
  ];
}

export function createProviderHubReadinessFromSettings(input: ProviderHubSettingsSnapshotInput): readonly LucaProviderHubReadinessResult[] {
  return evaluateProviderHubReadinessForAll({ connectionSnapshots: createProviderHubSettingsSnapshots(input) });
}
