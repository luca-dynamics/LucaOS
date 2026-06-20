import { createProviderHubRouteDecision, type LucaProviderHubRouteDecisionStatus, type LucaProviderHubRoutePreference } from "./providerHubRoutePlanner";
import type { LucaModelCapability, LucaModelTaskType } from "./modelRouterContract";
import type { LucaProviderHubConnectionTestResult } from "./providerHubConnectionTest";
import type { LucaProviderHubId } from "./providerHubRegistry";
import type { LucaProviderHubConnectionSnapshot } from "./providerHubReadiness";

export interface LucaProviderHubRuntimeRouteSelectionInput {
  readonly runtimeRouteSelectionEnabled: boolean;
  readonly taskType: LucaModelTaskType;
  readonly requiredCapabilities: readonly LucaModelCapability[];
  readonly routePreference: LucaProviderHubRoutePreference;
  readonly connectionSnapshots: readonly LucaProviderHubConnectionSnapshot[];
  readonly connectionTestResults?: readonly LucaProviderHubConnectionTestResult[];
  readonly preferredProviderId?: LucaProviderHubId;
  readonly allowFallbacks: boolean;
  readonly allowPaidProviders: boolean;
  readonly allowLocalProviders: boolean;
  readonly allowCloudProviders: boolean;
  readonly currentProviderId?: string;
  readonly currentModelId?: string;
}

export interface LucaProviderHubRuntimeRouteSelectionResult {
  readonly enabled: boolean;
  readonly decisionStatus: LucaProviderHubRouteDecisionStatus | "disabled";
  readonly selectedProviderId?: LucaProviderHubId;
  readonly selectedModelId?: string;
  readonly shouldUseProviderHubRoute: boolean;
  readonly fallbackToCurrentRuntime: boolean;
  readonly reason: string;
  readonly safeDiagnosticsText: string;
  readonly sideEffectsPerformed: false;
  readonly providerApiCalled: false;
  readonly providerAdapterInstantiated: false;
  readonly runtimeRoutingChanged: boolean;
}

const USABLE_STATUSES: readonly LucaProviderHubRouteDecisionStatus[] = ["selected", "fallback_selected"];

function diagnostics(result: Omit<LucaProviderHubRuntimeRouteSelectionResult, "safeDiagnosticsText">, input: LucaProviderHubRuntimeRouteSelectionInput): string {
  return JSON.stringify({
    enabled: result.enabled,
    decisionStatus: result.decisionStatus,
    selectedProviderId: result.selectedProviderId ?? null,
    selectedModelId: result.selectedModelId ?? null,
    shouldUseProviderHubRoute: result.shouldUseProviderHubRoute,
    fallbackToCurrentRuntime: result.fallbackToCurrentRuntime,
    taskType: input.taskType,
    requiredCapabilities: input.requiredCapabilities,
    routePreference: input.routePreference,
    currentProviderId: input.currentProviderId ?? null,
    currentModelId: input.currentModelId ?? null,
    connectionSnapshotCount: input.connectionSnapshots.length,
    connectionTestResultCount: input.connectionTestResults?.length ?? 0,
    sideEffectsPerformed: false,
    providerApiCalled: false,
    providerAdapterInstantiated: false,
    runtimeRoutingChanged: result.runtimeRoutingChanged,
  });
}

export function selectProviderHubRuntimeRoute(input: LucaProviderHubRuntimeRouteSelectionInput): LucaProviderHubRuntimeRouteSelectionResult {
  if (!input.runtimeRouteSelectionEnabled) {
    const result = {
      enabled: false,
      decisionStatus: "disabled" as const,
      shouldUseProviderHubRoute: false,
      fallbackToCurrentRuntime: true,
      reason: "Provider Hub runtime route selection is disabled; current ProviderFactory runtime routing remains active.",
      sideEffectsPerformed: false as const,
      providerApiCalled: false as const,
      providerAdapterInstantiated: false as const,
      runtimeRoutingChanged: false,
    };
    return { ...result, safeDiagnosticsText: diagnostics(result, input) };
  }

  const decision = createProviderHubRouteDecision({
    taskType: input.taskType,
    requiredCapabilities: input.requiredCapabilities,
    preference: input.routePreference,
    connectionSnapshots: input.connectionSnapshots,
    connectionTestResults: input.connectionTestResults,
    preferredProviderId: input.preferredProviderId,
    allowFallbacks: input.allowFallbacks,
    allowPaidProviders: input.allowPaidProviders,
    allowLocalProviders: input.allowLocalProviders,
    allowCloudProviders: input.allowCloudProviders,
  });
  const usable = USABLE_STATUSES.includes(decision.status);
  const result = {
    enabled: true,
    decisionStatus: decision.status,
    selectedProviderId: usable ? decision.selectedProviderId : undefined,
    selectedModelId: usable ? decision.selectedModelId : undefined,
    shouldUseProviderHubRoute: usable,
    fallbackToCurrentRuntime: !usable,
    reason: usable ? `${decision.reason} Runtime bridge is enabled and may return this Provider Hub route to guarded runtime code.` : `${decision.reason} Current runtime remains active.`,
    sideEffectsPerformed: false as const,
    providerApiCalled: false as const,
    providerAdapterInstantiated: false as const,
    runtimeRoutingChanged: false,
  };
  return { ...result, safeDiagnosticsText: diagnostics(result, input) };
}
