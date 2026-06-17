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
  readonly disabledProviderIds?: readonly LucaProviderHubId[];
}

export interface LucaProviderHubSettingsSnapshotsInput {
  readonly settings?: {
    readonly brain?: {
      readonly useCustomApiKey?: boolean;
      readonly geminiApiKey?: string;
      readonly anthropicApiKey?: string;
      readonly openaiApiKey?: string;
      readonly xaiApiKey?: string;
      readonly deepseekApiKey?: string;
      readonly groqApiKey?: string;
      readonly openRouterApiKey?: string;
      readonly openaiBaseUrl?: string;
      readonly geminiBaseUrl?: string;
      readonly anthropicBaseUrl?: string;
      readonly xaiBaseUrl?: string;
      readonly deepseekBaseUrl?: string;
      readonly groqBaseUrl?: string;
      readonly model?: string;
      readonly provider?: string;
    };
    readonly general?: {
      readonly activeBrainId?: string | null;
    };
  };
  readonly ollamaAvailable?: boolean;
  readonly lmStudioAvailable?: boolean;
  readonly localRuntimeAvailable?: boolean;
  readonly disabledProviderIds?: readonly LucaProviderHubId[];
}

export interface LucaProviderHubReadinessFromSettingsOptions {
  readonly taskType?: LucaModelTaskType;
  readonly requiredCapabilities?: readonly LucaModelCapability[];
}

const LOCAL_RUNTIME_PROVIDER_IDS = new Set<LucaProviderHubId>(["ollama", "lm_studio", "local_runtime"]);

function hasPresentString(input: string | undefined): boolean {
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

function hasPresentSecret(input: string | undefined): boolean {
  return hasPresentString(input);
}

export function createProviderHubSettingsSnapshots(
  input: LucaProviderHubSettingsSnapshotsInput = {},
): readonly LucaProviderHubConnectionSnapshot[] {
  const brain = input.settings?.brain;
  const selectedModelId = input.settings?.general?.activeBrainId ?? brain?.model;

  return createProviderHubSnapshotsFromSettings({
    selectedProvider: brain?.provider,
    selectedModelId: selectedModelId ?? undefined,
    useCustomApiKey: brain?.useCustomApiKey,
    customApiKeyProvider: brain?.provider,
    customBaseUrl: brain?.openaiBaseUrl,
    providerKeyPresence: {
      google_gemini: hasPresentSecret(brain?.geminiApiKey),
      anthropic: hasPresentSecret(brain?.anthropicApiKey),
      openai: hasPresentSecret(brain?.openaiApiKey),
      xai_grok: hasPresentSecret(brain?.xaiApiKey),
      deepseek: hasPresentSecret(brain?.deepseekApiKey),
      groq: hasPresentSecret(brain?.groqApiKey),
      openrouter: hasPresentSecret(brain?.openRouterApiKey),
    },
    localRuntimeAvailability: {
      ollama: input.ollamaAvailable ?? false,
      lm_studio: input.lmStudioAvailable ?? false,
      local_runtime: input.localRuntimeAvailable ?? false,
    },
    disabledProviderIds: input.disabledProviderIds,
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
