import type { LucaModelCapability, LucaModelTaskType } from "./modelRouterContract";
import type { LucaProviderHubConnectionTestResult, LucaProviderHubConnectionTestStatus } from "./providerHubConnectionTest";
import { getProviderHubEntries, type LucaProviderHubCategory, type LucaProviderHubId } from "./providerHubRegistry";
import {
  evaluateProviderHubReadiness,
  type LucaProviderHubConnectionSnapshot,
  type LucaProviderHubConnectionState,
  type LucaProviderHubRequiredAction,
} from "./providerHubReadiness";

export type LucaProviderHubRoutePreference =
  | "balanced"
  | "privacy_first"
  | "lowest_latency"
  | "lowest_cost"
  | "local_first"
  | "managed_first"
  | "cloud_first";

export interface LucaProviderHubRouteRequest {
  readonly taskType: LucaModelTaskType;
  readonly requiredCapabilities: readonly LucaModelCapability[];
  readonly preference: LucaProviderHubRoutePreference;
  readonly connectionSnapshots: readonly LucaProviderHubConnectionSnapshot[];
  readonly connectionTestResults?: readonly LucaProviderHubConnectionTestResult[];
  readonly preferredProviderId?: LucaProviderHubId;
  readonly allowFallbacks: boolean;
  readonly allowPaidProviders: boolean;
  readonly allowLocalProviders: boolean;
  readonly allowCloudProviders: boolean;
}

export interface LucaProviderHubRouteCandidate {
  readonly providerId: LucaProviderHubId;
  readonly providerLabel: string;
  readonly providerCategory: LucaProviderHubCategory;
  readonly providerType: string;
  readonly configuredModelId?: string;
  readonly readinessState: LucaProviderHubConnectionState;
  readonly ready: boolean;
  readonly supported: boolean;
  readonly score: number;
  readonly reasons: readonly string[];
  readonly requiredAction?: LucaProviderHubRequiredAction;
  readonly connectionTestStatus?: LucaProviderHubConnectionTestStatus;
}

export type LucaProviderHubRouteDecisionStatus =
  | "selected"
  | "fallback_selected"
  | "blocked"
  | "no_supported_provider"
  | "configuration_required";

export interface LucaProviderHubRouteDecision {
  readonly selectedProviderId?: LucaProviderHubId;
  readonly selectedModelId?: string;
  readonly selectedProviderLabel?: string;
  readonly taskType: LucaModelTaskType;
  readonly requiredCapabilities: readonly LucaModelCapability[];
  readonly preference: LucaProviderHubRoutePreference;
  readonly status: LucaProviderHubRouteDecisionStatus;
  readonly candidates: readonly LucaProviderHubRouteCandidate[];
  readonly fallbackCandidates: readonly LucaProviderHubRouteCandidate[];
  readonly blockedCandidates: readonly LucaProviderHubRouteCandidate[];
  readonly reason: string;
  readonly safeDiagnosticsText: string;
  readonly sideEffectsPerformed: false;
  readonly runtimeRoutingChanged: false;
  readonly providerApiCalled: false;
}

const CLOUD_CATEGORIES: readonly LucaProviderHubCategory[] = ["luca_managed", "connected_cloud", "router", "custom"];
const LOCAL_CATEGORIES: readonly LucaProviderHubCategory[] = ["local_runtime"];

function latestByProvider<T extends { readonly providerId: LucaProviderHubId; readonly checkedAt?: string }>(items: readonly T[] = []): Map<LucaProviderHubId, T> {
  const map = new Map<LucaProviderHubId, T>();
  for (const item of items) {
    const prior = map.get(item.providerId);
    if (!prior || String(item.checkedAt ?? "") >= String(prior.checkedAt ?? "")) map.set(item.providerId, item);
  }
  return map;
}

function isCloud(category: LucaProviderHubCategory): boolean { return CLOUD_CATEGORIES.includes(category); }
function isLocal(category: LucaProviderHubCategory): boolean { return LOCAL_CATEGORIES.includes(category); }

export function createProviderHubRouteCandidates(request: LucaProviderHubRouteRequest): readonly LucaProviderHubRouteCandidate[] {
  const snapshots = latestByProvider(request.connectionSnapshots);
  const tests = latestByProvider(request.connectionTestResults ?? []);

  return getProviderHubEntries().map((entry) => {
    const readiness = evaluateProviderHubReadiness({
      providerId: entry.providerId,
      taskType: request.taskType,
      requiredCapabilities: request.requiredCapabilities,
      connectionSnapshot: snapshots.get(entry.providerId),
    });
    const test = tests.get(entry.providerId);
    const allowBlocked = (isCloud(entry.category) && !request.allowCloudProviders)
      || (isLocal(entry.category) && !request.allowLocalProviders)
      || (entry.defaultCostTier !== "free" && entry.defaultCostTier !== "unknown" && !request.allowPaidProviders);
    const failedTestBlocks = test?.status === "failed" && !request.allowFallbacks;
    const supported = entry.supportedTaskTypes.includes(request.taskType)
      && request.requiredCapabilities.every((capability) => entry.capabilities.includes(capability));
    const reasons = [readiness.reason];
    if (allowBlocked) reasons.push("Provider is blocked by route allow flags.");
    if (test?.status === "success") reasons.push("Manual connection test succeeded.");
    if (test?.status === "failed") reasons.push("Manual connection test failed; planner treats this as a safe negative signal.");
    if (test?.status === "unsupported") reasons.push("Manual connection testing is unsupported and does not block readiness.");

    const unscored: LucaProviderHubRouteCandidate = {
      providerId: entry.providerId,
      providerLabel: entry.label,
      providerCategory: entry.category,
      providerType: entry.providerType,
      configuredModelId: snapshots.get(entry.providerId)?.configuredModelId,
      readinessState: allowBlocked ? "disabled" : readiness.state,
      ready: readiness.ready && !allowBlocked && !failedTestBlocks,
      supported,
      score: 0,
      reasons,
      requiredAction: readiness.requiredAction === "none" ? undefined : readiness.requiredAction,
      connectionTestStatus: test?.status,
    };
    return { ...unscored, score: scoreProviderHubRouteCandidate(unscored, request) };
  });
}

export function scoreProviderHubRouteCandidate(candidate: LucaProviderHubRouteCandidate, request: LucaProviderHubRouteRequest): number {
  let score = 0;
  if (candidate.supported) score += 100;
  if (candidate.ready) score += 1000;
  if (candidate.configuredModelId) score += 20;
  if (candidate.providerId === request.preferredProviderId) score += 500;
  if (candidate.connectionTestStatus === "success") score += 75;
  if (candidate.connectionTestStatus === "failed") score -= request.allowFallbacks ? 150 : 1200;
  if (candidate.providerCategory === "local_runtime") score += request.preference === "privacy_first" || request.preference === "local_first" ? 250 : 0;
  if (candidate.providerId === "luca_prime" && request.preference === "managed_first") score += 300;
  if (candidate.providerCategory !== "local_runtime" && request.preference === "cloud_first") score += 150;
  if (request.preference === "lowest_latency") {
    if (candidate.providerId === "groq" || candidate.providerId === "luca_prime") score += 120;
    if (candidate.providerCategory === "local_runtime") score += 80;
  }
  if (request.preference === "lowest_cost") {
    if (candidate.providerCategory === "local_runtime") score += 220;
    if (["google_gemini", "deepseek", "groq", "together", "fireworks"].includes(candidate.providerId)) score += 80;
  }
  score -= getProviderHubEntries().findIndex((entry) => entry.providerId === candidate.providerId);
  return score;
}

function sortCandidates(candidates: readonly LucaProviderHubRouteCandidate[]): LucaProviderHubRouteCandidate[] {
  return [...candidates].sort((a, b) => b.score - a.score || a.providerId.localeCompare(b.providerId));
}

export function createProviderHubRouteDecision(request: LucaProviderHubRouteRequest): LucaProviderHubRouteDecision {
  const candidates = createProviderHubRouteCandidates(request);
  const supported = candidates.filter((candidate) => candidate.supported);
  const ready = sortCandidates(supported.filter((candidate) => candidate.ready));
  const blockedCandidates = candidates.filter((candidate) => !candidate.ready);
  const preferred = request.preferredProviderId ? ready.find((candidate) => candidate.providerId === request.preferredProviderId) : undefined;
  const selected = preferred ?? (request.allowFallbacks || !request.preferredProviderId ? ready[0] : undefined);
  let status: LucaProviderHubRouteDecisionStatus;
  let reason: string;
  if (selected) {
    status = preferred || !request.preferredProviderId ? "selected" : "fallback_selected";
    reason = `${selected.providerLabel} selected by pure Provider Hub route planning.`;
  } else if (supported.length === 0) {
    status = "no_supported_provider";
    reason = "No Provider Hub provider supports the requested task and capabilities.";
  } else if (!request.allowFallbacks && request.preferredProviderId && supported.some((candidate) => candidate.providerId === request.preferredProviderId)) {
    status = "blocked";
    reason = "Preferred provider is unavailable and fallback selection is disabled.";
  } else {
    status = "configuration_required";
    reason = "At least one supported Provider Hub provider requires configuration before it can be selected.";
  }
  const fallbackCandidates = selected ? ready.filter((candidate) => candidate.providerId !== selected.providerId) : ready;
  const decisionBase = {
    selectedProviderId: selected?.providerId,
    selectedModelId: selected?.configuredModelId,
    selectedProviderLabel: selected?.providerLabel,
    taskType: request.taskType,
    requiredCapabilities: [...request.requiredCapabilities],
    preference: request.preference,
    status,
    candidates,
    fallbackCandidates,
    blockedCandidates,
    reason,
    sideEffectsPerformed: false as const,
    runtimeRoutingChanged: false as const,
    providerApiCalled: false as const,
  };
  return { ...decisionBase, safeDiagnosticsText: createProviderHubRouteDecisionDiagnostics(decisionBase) };
}

export function createProviderHubRouteDecisionDiagnostics(decision: Omit<LucaProviderHubRouteDecision, "safeDiagnosticsText"> | LucaProviderHubRouteDecision): string {
  return JSON.stringify({
    taskType: decision.taskType,
    requiredCapabilities: decision.requiredCapabilities,
    preference: decision.preference,
    selectedProvider: decision.selectedProviderId ?? null,
    selectedModelId: decision.selectedModelId ?? null,
    status: decision.status,
    candidateCount: decision.candidates.length,
    fallbackCount: decision.fallbackCandidates.length,
    blockedCount: decision.blockedCandidates.length,
    topReasons: decision.candidates.slice(0, 5).flatMap((candidate) => candidate.reasons.slice(0, 2)),
    sideEffectsPerformed: false,
    runtimeRoutingChanged: false,
    providerApiCalled: false,
  });
}
