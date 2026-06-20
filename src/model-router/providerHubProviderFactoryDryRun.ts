/**
 * ProviderFactory ⇄ Provider Hub dry-run bridge.
 *
 * Pure comparison only: this module does not import ProviderFactory, runtime
 * adapters, network clients, storage, or environment access. It compares an
 * already-known current runtime route with a Provider Hub planner decision.
 */
import type { LucaModelCapability, LucaModelRouteMode, LucaModelTaskType } from "./modelRouterContract";
import { createProviderHubRouteDecision, type LucaProviderHubRouteDecisionStatus, type LucaProviderHubRoutePreference } from "./providerHubRoutePlanner";
import type { LucaProviderHubConnectionTestResult } from "./providerHubConnectionTest";
import type { LucaProviderHubId } from "./providerHubRegistry";
import type { LucaProviderHubConnectionSnapshot } from "./providerHubReadiness";

export interface LucaProviderFactoryDryRunInput {
  readonly currentProviderId?: string;
  readonly currentRouteMode?: LucaModelRouteMode | string;
  readonly currentModelId?: string;
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
}

export interface LucaProviderFactoryDryRunComparison {
  readonly currentProviderId?: string;
  readonly currentModelId?: string;
  readonly providerHubSelectedProviderId?: LucaProviderHubId;
  readonly providerHubSelectedModelId?: string;
  readonly providerHubDecisionStatus: LucaProviderHubRouteDecisionStatus;
  readonly matchesCurrentRoute: boolean;
  readonly mismatchReason?: string;
  readonly providerHubReason: string;
  readonly safeDiagnosticsText: string;
  readonly sideEffectsPerformed: false;
  readonly runtimeRoutingChanged: false;
  readonly providerApiCalled: false;
}

const PROVIDER_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  "luca-prime": "luca_prime",
  "cloud-managed": "luca_prime",
  gemini: "google_gemini",
  google: "google_gemini",
  xai: "xai_grok",
  grok: "xai_grok",
  local: "ollama",
});

function normalizeProviderId(providerId?: string): string | undefined {
  if (!providerId) return undefined;
  const normalized = providerId.trim().toLowerCase().replace(/\s+/g, "_");
  return PROVIDER_ALIASES[normalized] ?? normalized;
}

function modelMatches(currentModelId?: string, plannedModelId?: string): boolean {
  if (!plannedModelId) return true;
  return currentModelId === plannedModelId;
}

function sanitizeDiagnosticsText(text: string): string {
  return text.replace(/(api[_-]?key|token|secret|authorization|password)[^,;}\]]*/gi, "$1=redacted");
}

export function createProviderFactoryProviderHubDryRunComparison(input: LucaProviderFactoryDryRunInput): LucaProviderFactoryDryRunComparison {
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

  const currentProvider = normalizeProviderId(input.currentProviderId);
  const plannedProvider = normalizeProviderId(decision.selectedProviderId);
  const providerMatches = Boolean(currentProvider && plannedProvider && currentProvider === plannedProvider);
  const matchesCurrentRoute = providerMatches && modelMatches(input.currentModelId, decision.selectedModelId);
  let mismatchReason: string | undefined;
  if (!currentProvider && !input.currentModelId) {
    mismatchReason = "Current runtime route unavailable; Provider Hub plan is shown for review only.";
  } else if (!plannedProvider) {
    mismatchReason = `Provider Hub did not select a provider because decision status is ${decision.status}.`;
  } else if (!providerMatches) {
    mismatchReason = `Current runtime would use ${input.currentProviderId ?? "unknown"}, but Provider Hub planner would choose ${decision.selectedProviderId}.`;
  } else if (!modelMatches(input.currentModelId, decision.selectedModelId)) {
    mismatchReason = `Current runtime model ${input.currentModelId ?? "unknown"} differs from Provider Hub planned model ${decision.selectedModelId}.`;
  }

  const safeDiagnosticsText = sanitizeDiagnosticsText(JSON.stringify({
    currentProviderId: input.currentProviderId ?? null,
    currentRouteMode: input.currentRouteMode ?? null,
    currentModelId: input.currentModelId ?? null,
    providerHubSelectedProviderId: decision.selectedProviderId ?? null,
    providerHubSelectedModelId: decision.selectedModelId ?? null,
    providerHubDecisionStatus: decision.status,
    matchesCurrentRoute,
    mismatchReason: mismatchReason ?? null,
    providerHubReason: decision.reason,
    providerHubDiagnostics: decision.safeDiagnosticsText,
    sideEffectsPerformed: false,
    runtimeRoutingChanged: false,
    providerApiCalled: false,
  }));

  return {
    currentProviderId: input.currentProviderId,
    currentModelId: input.currentModelId,
    providerHubSelectedProviderId: decision.selectedProviderId,
    providerHubSelectedModelId: decision.selectedModelId,
    providerHubDecisionStatus: decision.status,
    matchesCurrentRoute,
    mismatchReason,
    providerHubReason: decision.reason,
    safeDiagnosticsText,
    sideEffectsPerformed: false,
    runtimeRoutingChanged: false,
    providerApiCalled: false,
  };
}
