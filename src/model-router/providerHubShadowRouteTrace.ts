/**
 * Provider Hub shadow route trace.
 *
 * Pure diagnostics only: compares an already-observed runtime route with the
 * Provider Hub planner. It never changes runtime routing, executes providers,
 * touches storage, reads environment variables, or performs network activity.
 */
import type { LucaModelCapability, LucaModelRouteMode, LucaModelTaskType } from "./modelRouterContract";
import type { LucaProviderHubConnectionTestResult } from "./providerHubConnectionTest";
import type { LucaProviderHubId } from "./providerHubRegistry";
import type { LucaProviderHubConnectionSnapshot } from "./providerHubReadiness";
import { createProviderHubRuntimeDryRunComparison } from "./providerHubRuntimeDryRunComparison";
import { createProviderHubRouteDecision, type LucaProviderHubRouteDecisionStatus, type LucaProviderHubRoutePreference } from "./providerHubRoutePlanner";

export type LucaProviderHubShadowRouteTraceTrigger =
  | "model_manager_preview"
  | "runtime_route_status"
  | "operation_center_fixture"
  | "manual_diagnostics";

export interface LucaProviderHubShadowRouteTraceInput {
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
  readonly trigger: LucaProviderHubShadowRouteTraceTrigger;
  readonly observedAt: string;
}

export interface LucaProviderHubShadowRouteTrace {
  readonly traceId: string;
  readonly trigger: LucaProviderHubShadowRouteTraceTrigger;
  readonly observedAt: string;
  readonly currentProviderId?: string;
  readonly currentModelId?: string;
  readonly providerHubSelectedProviderId?: LucaProviderHubId;
  readonly providerHubSelectedModelId?: string;
  readonly providerHubDecisionStatus: LucaProviderHubRouteDecisionStatus;
  readonly matchesCurrentRoute: boolean;
  readonly mismatchReason?: string;
  readonly providerHubReason: string;
  readonly routePreference: LucaProviderHubRoutePreference;
  readonly taskType: LucaModelTaskType;
  readonly requiredCapabilities: readonly LucaModelCapability[];
  readonly fallbackCandidateCount: number;
  readonly blockedCandidateCount: number;
  readonly candidateCount: number;
  readonly safeDiagnosticsText: string;
  readonly sideEffectsPerformed: false;
  readonly runtimeRoutingChanged: false;
  readonly providerApiCalled: false;
}

function sanitizeDiagnosticsText(text: string): string {
  return text.replace(/(api[_-]?key|token|secret|authorization|password)[^,;\]}]*/gi, "$1=redacted");
}

function traceIdFor(input: Pick<LucaProviderHubShadowRouteTraceInput, "trigger" | "observedAt" | "taskType" | "routePreference">): string {
  return `provider-hub-shadow:${input.trigger}:${input.taskType}:${input.routePreference}:${input.observedAt}`.replace(/[^a-zA-Z0-9:_-]+/g, "-");
}

export function createProviderHubShadowRouteTrace(input: LucaProviderHubShadowRouteTraceInput): LucaProviderHubShadowRouteTrace {
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
  const comparison = createProviderHubRuntimeDryRunComparison(input);
  const traceBase = {
    traceId: traceIdFor(input),
    trigger: input.trigger,
    observedAt: input.observedAt,
    currentProviderId: input.currentProviderId,
    currentModelId: input.currentModelId,
    providerHubSelectedProviderId: decision.selectedProviderId,
    providerHubSelectedModelId: decision.selectedModelId,
    providerHubDecisionStatus: decision.status,
    matchesCurrentRoute: comparison.matchesCurrentRoute,
    mismatchReason: comparison.mismatchReason,
    providerHubReason: decision.reason,
    routePreference: input.routePreference,
    taskType: input.taskType,
    requiredCapabilities: [...input.requiredCapabilities],
    fallbackCandidateCount: decision.fallbackCandidates.length,
    blockedCandidateCount: decision.blockedCandidates.length,
    candidateCount: decision.candidates.length,
    sideEffectsPerformed: false as const,
    runtimeRoutingChanged: false as const,
    providerApiCalled: false as const,
  };
  return { ...traceBase, safeDiagnosticsText: createProviderHubShadowRouteTraceDiagnostics(traceBase) };
}

export function summarizeProviderHubShadowRouteTrace(trace: LucaProviderHubShadowRouteTrace): string {
  const current = trace.currentProviderId ? `${trace.currentProviderId}${trace.currentModelId ? ` / ${trace.currentModelId}` : ""}` : "unavailable";
  const planned = trace.providerHubSelectedProviderId ? `${trace.providerHubSelectedProviderId}${trace.providerHubSelectedModelId ? ` / ${trace.providerHubSelectedModelId}` : ""}` : "none";
  return `Shadow trace ${trace.matchesCurrentRoute ? "matched" : "mismatched"}: current route ${current}; Provider Hub planned ${planned}; candidates ${trace.candidateCount}, fallbacks ${trace.fallbackCandidateCount}, blocked ${trace.blockedCandidateCount}.`;
}

export function createProviderHubShadowRouteTraceDiagnostics(trace: Omit<LucaProviderHubShadowRouteTrace, "safeDiagnosticsText"> | LucaProviderHubShadowRouteTrace): string {
  return sanitizeDiagnosticsText(JSON.stringify({
    traceId: trace.traceId,
    trigger: trace.trigger,
    observedAt: trace.observedAt,
    currentProviderId: trace.currentProviderId ?? null,
    currentModelId: trace.currentModelId ?? null,
    providerHubSelectedProviderId: trace.providerHubSelectedProviderId ?? null,
    providerHubSelectedModelId: trace.providerHubSelectedModelId ?? null,
    providerHubDecisionStatus: trace.providerHubDecisionStatus,
    matchesCurrentRoute: trace.matchesCurrentRoute,
    mismatchReason: trace.mismatchReason ?? null,
    providerHubReason: trace.providerHubReason,
    routePreference: trace.routePreference,
    taskType: trace.taskType,
    requiredCapabilities: trace.requiredCapabilities,
    candidateCount: trace.candidateCount,
    fallbackCandidateCount: trace.fallbackCandidateCount,
    blockedCandidateCount: trace.blockedCandidateCount,
    sideEffectsPerformed: false,
    runtimeRoutingChanged: false,
    providerApiCalled: false,
  }));
}
