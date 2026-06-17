import type { LucaModelCapability, LucaModelProviderType, LucaModelTaskType } from "./modelRouterContract";
import {
  getProviderHubEntries,
  getProviderHubEntry,
  type LucaProviderHubCategory,
  type LucaProviderHubId,
} from "./providerHubRegistry";

export type LucaProviderHubConnectionState =
  | "ready"
  | "missing_user_key"
  | "missing_base_url"
  | "local_runtime_unavailable"
  | "disabled"
  | "unknown"
  | "unsupported_task"
  | "unsupported_capability";

export type LucaProviderHubRequiredAction =
  | "none"
  | "connect_provider"
  | "add_api_key"
  | "set_base_url"
  | "start_local_runtime"
  | "select_supported_model"
  | "enable_provider"
  | "choose_known_provider";

export interface LucaProviderHubConnectionSnapshot {
  readonly providerId: LucaProviderHubId;
  readonly hasUserKey?: boolean;
  readonly hasCustomBaseUrl?: boolean;
  readonly localRuntimeAvailable?: boolean;
  readonly enabled?: boolean;
  readonly configuredModelId?: string;
  readonly checkedAt?: string;
}

export interface LucaProviderHubReadinessRequest {
  readonly providerId: LucaProviderHubId;
  readonly taskType?: LucaModelTaskType;
  readonly requiredCapabilities?: readonly LucaModelCapability[];
  readonly connectionSnapshot?: LucaProviderHubConnectionSnapshot;
}

export interface LucaProviderHubReadinessResult {
  readonly providerId: LucaProviderHubId;
  readonly providerType: LucaModelProviderType;
  readonly category: LucaProviderHubCategory;
  readonly state: LucaProviderHubConnectionState;
  readonly ready: boolean;
  readonly requiredAction: LucaProviderHubRequiredAction;
  readonly reason: string;
  readonly requiresUserKey: boolean;
  readonly hasUserKey: boolean;
  readonly supportsCustomBaseUrl: boolean;
  readonly hasCustomBaseUrl: boolean;
  readonly localRuntimeAvailable: boolean;
  readonly supportedTaskTypes: readonly LucaModelTaskType[];
  readonly capabilities: readonly LucaModelCapability[];
  readonly missingCapabilities: readonly LucaModelCapability[];
  readonly sideEffectsPerformed: false;
}

export interface LucaProviderHubReadinessForAllInput {
  readonly taskType?: LucaModelTaskType;
  readonly requiredCapabilities?: readonly LucaModelCapability[];
  readonly connectionSnapshots?: readonly LucaProviderHubConnectionSnapshot[];
}

export interface LucaProviderHubReadinessSummary {
  readonly totalProviders: number;
  readonly readyProviders: number;
  readonly providersRequiringAction: number;
  readonly states: Readonly<Record<LucaProviderHubConnectionState, number>>;
  readonly requiredActions: Readonly<Record<LucaProviderHubRequiredAction, number>>;
}

export function createProviderHubConnectionSnapshot(input: LucaProviderHubConnectionSnapshot): LucaProviderHubConnectionSnapshot {
  return { ...input };
}

export function evaluateProviderHubReadiness(request: LucaProviderHubReadinessRequest): LucaProviderHubReadinessResult {
  const entry = getProviderHubEntry(request.providerId);
  const snapshot = request.connectionSnapshot;
  const hasUserKey = snapshot?.hasUserKey ?? false;
  const hasCustomBaseUrl = snapshot?.hasCustomBaseUrl ?? false;
  const localRuntimeAvailable = snapshot?.localRuntimeAvailable ?? false;
  const missingCapabilities = (request.requiredCapabilities ?? []).filter((capability) => !entry.capabilities.includes(capability));

  const base = {
    providerId: entry.providerId,
    providerType: entry.providerType,
    category: entry.category,
    requiresUserKey: entry.requiresUserKey,
    hasUserKey,
    supportsCustomBaseUrl: entry.supportsCustomBaseUrl,
    hasCustomBaseUrl,
    localRuntimeAvailable,
    supportedTaskTypes: [...entry.supportedTaskTypes],
    capabilities: [...entry.capabilities],
    missingCapabilities,
    sideEffectsPerformed: false as const,
  };

  const complete = (
    state: LucaProviderHubConnectionState,
    ready: boolean,
    requiredAction: LucaProviderHubRequiredAction,
    reason: string,
  ): LucaProviderHubReadinessResult => ({ ...base, state, ready, requiredAction, reason });

  if (entry.providerId === "disabled" || snapshot?.enabled === false) {
    return complete("disabled", false, "enable_provider", `${entry.label} is disabled.`);
  }

  if (entry.providerId === "unknown" || entry.providerType === "unknown") {
    return complete("unknown", false, "choose_known_provider", "Provider is unknown and must be replaced with a known Provider Hub entry.");
  }

  if (entry.requiresUserKey && !hasUserKey) {
    return complete("missing_user_key", false, "add_api_key", `${entry.label} requires a user API key before Luca can use it.`);
  }

  if (entry.providerId === "custom_openai_compatible" && !hasCustomBaseUrl) {
    return complete("missing_base_url", false, "set_base_url", "Custom OpenAI-compatible providers require a base URL.");
  }

  if (entry.category === "local_runtime" && !localRuntimeAvailable) {
    return complete("local_runtime_unavailable", false, "start_local_runtime", `${entry.label} requires an available local runtime.`);
  }

  if (request.taskType && !entry.supportedTaskTypes.includes(request.taskType)) {
    return complete("unsupported_task", false, "select_supported_model", `${entry.label} does not support the requested ${request.taskType} task.`);
  }

  if (missingCapabilities.length > 0) {
    return complete("unsupported_capability", false, "select_supported_model", `${entry.label} is missing required capabilities: ${missingCapabilities.join(", ")}.`);
  }

  return complete("ready", true, "none", `${entry.label} is ready for the requested Provider Hub use.`);
}

export function evaluateProviderHubReadinessForAll(input: LucaProviderHubReadinessForAllInput = {}): readonly LucaProviderHubReadinessResult[] {
  const snapshotsByProvider = new Map((input.connectionSnapshots ?? []).map((snapshot) => [snapshot.providerId, snapshot]));

  return getProviderHubEntries().map((entry) => evaluateProviderHubReadiness({
    providerId: entry.providerId,
    taskType: input.taskType,
    requiredCapabilities: input.requiredCapabilities,
    connectionSnapshot: snapshotsByProvider.get(entry.providerId),
  }));
}

export function summarizeProviderHubReadiness(results: readonly LucaProviderHubReadinessResult[]): LucaProviderHubReadinessSummary {
  const states: Record<LucaProviderHubConnectionState, number> = {
    ready: 0,
    missing_user_key: 0,
    missing_base_url: 0,
    local_runtime_unavailable: 0,
    disabled: 0,
    unknown: 0,
    unsupported_task: 0,
    unsupported_capability: 0,
  };
  const requiredActions: Record<LucaProviderHubRequiredAction, number> = {
    none: 0,
    connect_provider: 0,
    add_api_key: 0,
    set_base_url: 0,
    start_local_runtime: 0,
    select_supported_model: 0,
    enable_provider: 0,
    choose_known_provider: 0,
  };

  for (const result of results) {
    states[result.state] += 1;
    requiredActions[result.requiredAction] += 1;
  }

  return {
    totalProviders: results.length,
    readyProviders: states.ready,
    providersRequiringAction: results.length - states.ready,
    states,
    requiredActions,
  };
}

export function getReadyProviderHubResults(results: readonly LucaProviderHubReadinessResult[]): readonly LucaProviderHubReadinessResult[] {
  return results.filter((result) => result.ready);
}

export function getProviderHubResultsRequiringAction(
  results: readonly LucaProviderHubReadinessResult[],
  action: LucaProviderHubRequiredAction,
): readonly LucaProviderHubReadinessResult[] {
  return results.filter((result) => result.requiredAction === action);
}
