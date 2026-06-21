import type { LucaSettings } from "../services/settingsService";
import type { ModelProvisioningRoute } from "../services/llm/ProviderFactory";
import type { LucaModelCapability, LucaModelTaskType } from "./modelRouterContract";
import { createProviderHubSettingsSnapshots } from "./providerHubSettingsSnapshot";
import { selectProviderHubRuntimeRoute } from "./providerHubRuntimeRouteSelection";
import type { LucaProviderHubRouteDecisionStatus, LucaProviderHubRoutePreference } from "./providerHubRoutePlanner";
import type { LucaProviderHubId } from "./providerHubRegistry";

export interface LucaProviderFactoryShadowSelectionInput {
  readonly currentRuntimeProviderId?: string;
  readonly currentRuntimeModelId?: string;
  readonly currentRouteMode: ModelProvisioningRoute["kind"];
  readonly taskType: LucaModelTaskType;
  readonly requiredCapabilities: readonly LucaModelCapability[];
  readonly currentSettingsSnapshot: LucaSettings;
  readonly routePreference: LucaProviderHubRoutePreference;
  readonly runtimeRouteSelectionEnabled: boolean;
  readonly allowFallbacks: boolean;
  readonly allowPaidProviders: boolean;
  readonly allowLocalProviders: boolean;
  readonly allowCloudProviders: boolean;
  readonly observedAt: string;
}

export interface LucaProviderFactoryShadowSelection {
  readonly currentProviderId?: string;
  readonly currentModelId?: string;
  readonly taskType: LucaModelTaskType;
  readonly requiredCapabilities: readonly LucaModelCapability[];
  readonly providerHubSelectedProviderId?: LucaProviderHubId;
  readonly providerHubSelectedModelId?: string;
  readonly providerHubEnabled: boolean;
  readonly shouldUseProviderHubRoute: boolean;
  readonly wouldFallbackToCurrentRuntime: boolean;
  readonly decisionStatus: LucaProviderHubRouteDecisionStatus | "disabled";
  readonly matchesCurrentRoute: boolean;
  readonly reason: string;
  readonly safeDiagnosticsText: string;
  readonly sideEffectsPerformed: false;
  readonly providerApiCalled: false;
  readonly providerAdapterInstantiated: false;
  readonly runtimeExecutionChanged: false;
}

const PROVIDER_FACTORY_TO_PROVIDER_HUB: Readonly<Record<string, LucaProviderHubId>> = {
  gemini: "google_gemini",
  anthropic: "anthropic",
  openai: "openai",
  xai: "xai_grok",
  groq: "groq",
  deepseek: "deepseek",
  luca_prime: "luca_prime",
  ollama: "ollama",
  local_runtime: "local_runtime",
};

export function getProviderHubIdForProviderFactoryRoute(route: ModelProvisioningRoute): LucaProviderHubId {
  if (route.kind === "LOCAL") return route.runtime === "ollama" ? "ollama" : "local_runtime";
  if (route.kind === "LUCA_PRIME") return "luca_prime";
  return PROVIDER_FACTORY_TO_PROVIDER_HUB[route.provider] ?? "unknown";
}

export function createProviderFactoryShadowSelection(input: LucaProviderFactoryShadowSelectionInput): LucaProviderFactoryShadowSelection {
  const connectionSnapshots = createProviderHubSettingsSnapshots({
    settings: input.currentSettingsSnapshot,
    ollamaAvailable: false,
  });
  const selection = selectProviderHubRuntimeRoute({
    runtimeRouteSelectionEnabled: input.runtimeRouteSelectionEnabled,
    taskType: input.taskType,
    requiredCapabilities: input.requiredCapabilities,
    routePreference: input.routePreference,
    connectionSnapshots,
    allowFallbacks: input.allowFallbacks,
    allowPaidProviders: input.allowPaidProviders,
    allowLocalProviders: input.allowLocalProviders,
    allowCloudProviders: input.allowCloudProviders,
    currentProviderId: input.currentRuntimeProviderId,
    currentModelId: input.currentRuntimeModelId,
  });
  const currentProviderHubId = input.currentRuntimeProviderId ? PROVIDER_FACTORY_TO_PROVIDER_HUB[input.currentRuntimeProviderId] ?? input.currentRuntimeProviderId : undefined;
  const matchesCurrentRoute = Boolean(
    selection.selectedProviderId &&
    currentProviderHubId === selection.selectedProviderId &&
    (!selection.selectedModelId || !input.currentRuntimeModelId || selection.selectedModelId === input.currentRuntimeModelId),
  );
  const diagnostics = JSON.stringify({
    observedAt: input.observedAt,
    currentProviderId: input.currentRuntimeProviderId ?? null,
    currentModelId: input.currentRuntimeModelId ?? null,
    currentRouteMode: input.currentRouteMode,
    taskType: input.taskType,
    requiredCapabilities: input.requiredCapabilities,
    providerHubSelectedProviderId: selection.selectedProviderId ?? null,
    providerHubSelectedModelId: selection.selectedModelId ?? null,
    providerHubEnabled: selection.enabled,
    shouldUseProviderHubRoute: selection.shouldUseProviderHubRoute,
    wouldFallbackToCurrentRuntime: selection.fallbackToCurrentRuntime,
    decisionStatus: selection.decisionStatus,
    matchesCurrentRoute,
    sideEffectsPerformed: false,
    providerApiCalled: false,
    providerAdapterInstantiated: false,
    runtimeExecutionChanged: false,
  });

  return {
    currentProviderId: input.currentRuntimeProviderId,
    currentModelId: input.currentRuntimeModelId,
    taskType: input.taskType,
    requiredCapabilities: input.requiredCapabilities,
    providerHubSelectedProviderId: selection.selectedProviderId,
    providerHubSelectedModelId: selection.selectedModelId,
    providerHubEnabled: selection.enabled,
    shouldUseProviderHubRoute: selection.shouldUseProviderHubRoute,
    wouldFallbackToCurrentRuntime: selection.fallbackToCurrentRuntime,
    decisionStatus: selection.decisionStatus,
    matchesCurrentRoute,
    reason: selection.enabled && selection.shouldUseProviderHubRoute
      ? `${selection.reason} ProviderFactory runtime execution is unchanged in this shadow hook.`
      : selection.reason,
    safeDiagnosticsText: diagnostics,
    sideEffectsPerformed: false,
    providerApiCalled: false,
    providerAdapterInstantiated: false,
    runtimeExecutionChanged: false,
  };
}
