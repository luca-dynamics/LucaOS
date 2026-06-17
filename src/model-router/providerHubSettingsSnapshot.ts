import type { LucaModelCapability, LucaModelTaskType } from "./modelRouterContract";
import {
  getProviderHubEntries,
  normalizeProviderHubId,
  type LucaProviderHubId,
} from "./providerHubRegistry";
import {
  evaluateProviderHubReadinessForAll,
  type LucaProviderHubConnectionSnapshot,
  type LucaProviderHubReadinessResult,
} from "./providerHubReadiness";

export interface LucaProviderHubSettingsSnapshotInput {
  readonly selectedProvider?: string;
  readonly selectedModelId?: string;
  readonly useCustomApiKey?: boolean;
  readonly customApiKeyProvider?: string;
  readonly customBaseUrl?: string;
  readonly providerKeyPresence?: Readonly<Record<string, boolean>>;
  readonly localRuntimeAvailability?: Readonly<Record<string, boolean>>;
  readonly disabledProviderIds?: readonly string[];
}


export interface LucaProviderHubSettingsSnapshotUiInput {
  readonly settings: {
    readonly general?: {
      readonly activeBrainId?: string | null;
      readonly activeEmbedId?: string | null;
    };
    readonly brain?: {
      readonly useCustomApiKey?: boolean;
      readonly geminiApiKey?: string;
      readonly geminiBaseUrl?: string;
      readonly anthropicApiKey?: string;
      readonly anthropicBaseUrl?: string;
      readonly openaiApiKey?: string;
      readonly openaiBaseUrl?: string;
      readonly xaiApiKey?: string;
      readonly xaiBaseUrl?: string;
      readonly deepseekApiKey?: string;
      readonly deepseekBaseUrl?: string;
      readonly groqApiKey?: string;
      readonly groqBaseUrl?: string;
      readonly openRouterApiKey?: string;
      readonly customOpenAiCompatibleApiKey?: string;
      readonly customOpenAiCompatibleBaseUrl?: string;
      readonly customOpenAiCompatibleModel?: string;
      readonly ollamaBaseUrl?: string;
      readonly lmStudioBaseUrl?: string;
      readonly model?: string;
      readonly embeddingModel?: string;
      readonly provider?: string;
    };
    readonly providerHub?: {
      readonly disabledProviderIds?: readonly string[];
    };
    readonly memory?: {
      readonly provider?: string;
      readonly model?: string;
    };
  };
  readonly ollamaAvailable?: boolean;
}

export interface LucaProviderHubReadinessFromSettingsOptions {
  readonly taskType?: LucaModelTaskType;
  readonly requiredCapabilities?: readonly LucaModelCapability[];
}

const LOCAL_RUNTIME_PROVIDER_IDS = new Set<LucaProviderHubId>(["ollama", "lm_studio", "local_runtime"]);

function hasPresentString(input: string | null | undefined): boolean {
  return typeof input === "string" && input.trim().length > 0;
}

function setNormalizedPresence(
  target: Partial<Record<LucaProviderHubId, boolean>>,
  rawProviderId: string,
  present: boolean,
): void {
  const providerId = normalizeProviderHubId(rawProviderId);
  if (providerId === "unknown" || providerId === "disabled") return;
  target[providerId] = Boolean(target[providerId] || present);
}

export function normalizeProviderKeyPresence(
  input: LucaProviderHubSettingsSnapshotInput,
): Readonly<Partial<Record<LucaProviderHubId, boolean>>> {
  const normalized: Partial<Record<LucaProviderHubId, boolean>> = {};

  for (const [rawProviderId, present] of Object.entries(input.providerKeyPresence ?? {})) {
    setNormalizedPresence(normalized, rawProviderId, present);
  }

  if (input.useCustomApiKey && input.customApiKeyProvider) {
    setNormalizedPresence(normalized, input.customApiKeyProvider, true);
  }

  return normalized;
}

export function normalizeLocalRuntimeAvailability(
  input: LucaProviderHubSettingsSnapshotInput,
): Readonly<Partial<Record<LucaProviderHubId, boolean>>> {
  const normalized: Partial<Record<LucaProviderHubId, boolean>> = {};

  for (const [rawProviderId, available] of Object.entries(input.localRuntimeAvailability ?? {})) {
    const providerId = normalizeProviderHubId(rawProviderId);
    if (!LOCAL_RUNTIME_PROVIDER_IDS.has(providerId)) continue;
    normalized[providerId] = Boolean(normalized[providerId] || available);
  }

  return normalized;
}

export function createProviderHubSnapshotsFromSettings(
  input: LucaProviderHubSettingsSnapshotInput,
): readonly LucaProviderHubConnectionSnapshot[] {
  const keyPresence = normalizeProviderKeyPresence(input);
  const localRuntimeAvailability = normalizeLocalRuntimeAvailability(input);
  const disabledProviderIds = new Set(input.disabledProviderIds ?? []);
  const selectedProviderId = input.selectedProvider ? normalizeProviderHubId(input.selectedProvider) : undefined;
  const customProviderId = input.customApiKeyProvider ? normalizeProviderHubId(input.customApiKeyProvider) : undefined;
  const hasCustomBaseUrl = hasPresentString(input.customBaseUrl);

  return getProviderHubEntries().map((entry) => {
    const snapshot: LucaProviderHubConnectionSnapshot = {
      providerId: entry.providerId,
      hasUserKey: keyPresence[entry.providerId] ?? false,
      hasCustomBaseUrl: entry.providerId === "custom_openai_compatible" && hasCustomBaseUrl,
      localRuntimeAvailable: localRuntimeAvailability[entry.providerId] ?? false,
      enabled: disabledProviderIds.has(entry.providerId) ? false : true,
      configuredModelId: selectedProviderId === entry.providerId && input.selectedModelId ? input.selectedModelId : undefined,
    };

    if (
      entry.providerId === "custom_openai_compatible" &&
      input.useCustomApiKey &&
      customProviderId === "custom_openai_compatible"
    ) {
      return { ...snapshot, hasUserKey: true };
    }

    return snapshot;
  });
}


function hasConfiguredSecret(value: string | undefined): boolean {
  return hasPresentString(value);
}

function firstPresentString(...values: readonly (string | null | undefined)[]): string | undefined {
  return values.find((value): value is string => hasPresentString(value));
}

export function createProviderHubSettingsSnapshots(
  input: LucaProviderHubSettingsSnapshotUiInput,
): readonly LucaProviderHubConnectionSnapshot[] {
  const brain = input.settings.brain;
  const selectedProvider = firstPresentString(brain?.provider, input.settings.memory?.provider);
  const selectedModelId = firstPresentString(
    input.settings.general?.activeBrainId,
    brain?.model,
    brain?.embeddingModel,
    input.settings.general?.activeEmbedId,
    input.settings.memory?.model,
  );

  return createProviderHubSnapshotsFromSettings({
    selectedProvider,
    selectedModelId,
    useCustomApiKey: brain?.useCustomApiKey,
    customApiKeyProvider: firstPresentString(selectedProvider, brain?.customOpenAiCompatibleApiKey ? "custom_openai_compatible" : undefined),
    customBaseUrl: firstPresentString(
      brain?.customOpenAiCompatibleBaseUrl,
      brain?.openaiBaseUrl,
      brain?.anthropicBaseUrl,
      brain?.geminiBaseUrl,
      brain?.xaiBaseUrl,
      brain?.deepseekBaseUrl,
      brain?.groqBaseUrl,
    ),
    providerKeyPresence: {
      openai: hasConfiguredSecret(brain?.openaiApiKey),
      anthropic: hasConfiguredSecret(brain?.anthropicApiKey),
      gemini: hasConfiguredSecret(brain?.geminiApiKey),
      xai: hasConfiguredSecret(brain?.xaiApiKey),
      deepseek: hasConfiguredSecret(brain?.deepseekApiKey),
      groq: hasConfiguredSecret(brain?.groqApiKey),
      openrouter: hasConfiguredSecret(brain?.openRouterApiKey),
      custom_openai_compatible: hasConfiguredSecret(brain?.customOpenAiCompatibleApiKey),
    },
    disabledProviderIds: input.settings.providerHub?.disabledProviderIds,
    localRuntimeAvailability: {
      ollama: Boolean(input.ollamaAvailable),
    },
  });
}

export function createProviderHubReadinessFromSettings(
  input: LucaProviderHubSettingsSnapshotInput,
  options: LucaProviderHubReadinessFromSettingsOptions = {},
): readonly LucaProviderHubReadinessResult[] {
  return evaluateProviderHubReadinessForAll({
    taskType: options.taskType,
    requiredCapabilities: options.requiredCapabilities,
    connectionSnapshots: createProviderHubSnapshotsFromSettings(input),
  });
}
