import type { LucaModelTaskType } from "./modelRouterContract";
import type { LucaProviderHubConnectionTestResult } from "./providerHubConnectionTest";
import type { LucaProviderHubConnectionSnapshot } from "./providerHubReadiness";
import type { LucaProviderHubId } from "./providerHubRegistry";
import { createProviderHubRouteDecision, type LucaProviderHubRouteDecisionStatus, type LucaProviderHubRoutePreference } from "./providerHubRoutePlanner";
import { createProviderHubRouteRequestFromPolicy, getProviderHubTaskRoutePolicies, resolveProviderHubTaskRoutePolicy } from "./providerHubTaskRoutePolicies";

export interface LucaProviderHubTaskRouteDiagnosticsInput {
  readonly connectionSnapshots: readonly LucaProviderHubConnectionSnapshot[];
  readonly connectionTestResults?: readonly LucaProviderHubConnectionTestResult[];
  readonly preferredProviderId?: LucaProviderHubId;
  readonly policyOverrides?: Partial<Record<LucaModelTaskType, {
    readonly preferenceOverride?: LucaProviderHubRoutePreference;
    readonly allowFallbacksOverride?: boolean;
    readonly allowPaidProvidersOverride?: boolean;
    readonly allowLocalProvidersOverride?: boolean;
    readonly allowCloudProvidersOverride?: boolean;
  }>>;
  readonly runtimeRouteSelectionEnabled?: boolean;
  readonly observedAt: string;
}

export interface LucaProviderHubTaskRouteDiagnosticsRow {
  readonly taskType: LucaModelTaskType;
  readonly policyId: LucaModelTaskType;
  readonly requiredCapabilities: readonly string[];
  readonly defaultPreference: LucaProviderHubRoutePreference;
  readonly allowFallbacks: boolean;
  readonly allowPaidProviders: boolean;
  readonly allowLocalProviders: boolean;
  readonly allowCloudProviders: boolean;
  readonly selectedProviderId?: LucaProviderHubId;
  readonly selectedProviderLabel?: string;
  readonly selectedModelId?: string;
  readonly decisionStatus: LucaProviderHubRouteDecisionStatus;
  readonly reason: string;
  readonly fallbackCandidateCount: number;
  readonly blockedCandidateCount: number;
  readonly routeEligibleForRuntime: boolean;
  readonly safetyNotes: readonly string[];
  readonly sideEffectsPerformed: false;
  readonly providerApiCalled: false;
}

export interface LucaProviderHubTaskRouteDiagnosticsMatrix {
  readonly observedAt: string;
  readonly rows: readonly LucaProviderHubTaskRouteDiagnosticsRow[];
  readonly readyTaskCount: number;
  readonly blockedTaskCount: number;
  readonly configurationRequiredTaskCount: number;
  readonly privateLocalCloudBlocked: boolean;
  readonly safeDiagnosticsText: string;
  readonly sideEffectsPerformed: false;
  readonly providerApiCalled: false;
}

const RUNTIME_ELIGIBLE_TASKS = new Set<LucaModelTaskType>(["chat", "fast_reply", "long_context", "private_local", "embedding"]);

export function createProviderHubTaskRouteDiagnosticsMatrix(input: LucaProviderHubTaskRouteDiagnosticsInput): LucaProviderHubTaskRouteDiagnosticsMatrix {
  const rows = getProviderHubTaskRoutePolicies().map((basePolicy) => {
    const overrides = input.policyOverrides?.[basePolicy.taskType];
    const policy = resolveProviderHubTaskRoutePolicy({ taskType: basePolicy.taskType, ...overrides });
    const decision = createProviderHubRouteDecision(createProviderHubRouteRequestFromPolicy(policy, {
      connectionSnapshots: input.connectionSnapshots,
      connectionTestResults: input.connectionTestResults,
      preferredProviderId: input.preferredProviderId,
    }));
    const routeEligibleForRuntime = Boolean(input.runtimeRouteSelectionEnabled && RUNTIME_ELIGIBLE_TASKS.has(policy.taskType) && (decision.status === "selected" || decision.status === "fallback_selected"));
    return {
      taskType: policy.taskType,
      policyId: policy.policy.id,
      requiredCapabilities: policy.requiredCapabilities,
      defaultPreference: policy.policy.defaultPreference,
      allowFallbacks: policy.allowFallbacks,
      allowPaidProviders: policy.allowPaidProviders,
      allowLocalProviders: policy.allowLocalProviders,
      allowCloudProviders: policy.allowCloudProviders,
      selectedProviderId: decision.selectedProviderId,
      selectedProviderLabel: decision.selectedProviderLabel,
      selectedModelId: decision.selectedModelId,
      decisionStatus: decision.status,
      reason: decision.reason,
      fallbackCandidateCount: decision.fallbackCandidates.length,
      blockedCandidateCount: decision.blockedCandidates.length,
      routeEligibleForRuntime,
      safetyNotes: policy.safetyNotes,
      sideEffectsPerformed: false as const,
      providerApiCalled: false as const,
    };
  });
  const matrixBase = {
    observedAt: input.observedAt,
    rows,
    readyTaskCount: rows.filter((row) => row.decisionStatus === "selected" || row.decisionStatus === "fallback_selected").length,
    blockedTaskCount: rows.filter((row) => row.decisionStatus === "blocked" || row.decisionStatus === "no_supported_provider").length,
    configurationRequiredTaskCount: rows.filter((row) => row.decisionStatus === "configuration_required").length,
    privateLocalCloudBlocked: rows.some((row) => row.taskType === "private_local" && !row.allowCloudProviders),
    sideEffectsPerformed: false as const,
    providerApiCalled: false as const,
  };
  return { ...matrixBase, safeDiagnosticsText: createProviderHubTaskRouteDiagnosticsText(matrixBase) };
}

export function summarizeProviderHubTaskRouteDiagnosticsMatrix(matrix: Pick<LucaProviderHubTaskRouteDiagnosticsMatrix, "rows" | "readyTaskCount" | "blockedTaskCount" | "configurationRequiredTaskCount" | "privateLocalCloudBlocked">): string {
  return `Provider Hub task route diagnostics: ${matrix.readyTaskCount} ready, ${matrix.configurationRequiredTaskCount} configuration required, ${matrix.blockedTaskCount} blocked across ${matrix.rows.length} task policies; private_local cloud blocked=${matrix.privateLocalCloudBlocked}; diagnostics only.`;
}

export function createProviderHubTaskRouteDiagnosticsText(matrix: Omit<LucaProviderHubTaskRouteDiagnosticsMatrix, "safeDiagnosticsText"> | LucaProviderHubTaskRouteDiagnosticsMatrix): string {
  return JSON.stringify({
    observedAt: matrix.observedAt,
    summary: summarizeProviderHubTaskRouteDiagnosticsMatrix(matrix),
    rows: matrix.rows.map((row) => ({ taskType: row.taskType, policyId: row.policyId, requiredCapabilities: row.requiredCapabilities, defaultPreference: row.defaultPreference, selectedProviderId: row.selectedProviderId ?? null, selectedModelId: row.selectedModelId ?? null, decisionStatus: row.decisionStatus, fallbackCandidateCount: row.fallbackCandidateCount, blockedCandidateCount: row.blockedCandidateCount, routeEligibleForRuntime: row.routeEligibleForRuntime, safetyNotes: row.safetyNotes, sideEffectsPerformed: false, providerApiCalled: false })),
    sideEffectsPerformed: false,
    providerApiCalled: false,
    automaticConnectionTest: false,
    localRuntimeStartup: false,
  });
}
