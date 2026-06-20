/**
 * Provider Hub shadow route trace Operation Center bridge.
 *
 * Converts pure shadow traces into read-only Operation Center items. It does
 * not execute ProviderFactory, switch runtime routes, call provider APIs, run
 * connection tests, write settings, or start local runtimes.
 */
import type { LucaProviderHubShadowRouteTrace } from "../model-router/providerHubShadowRouteTrace";
import { summarizeProviderHubShadowRouteTrace } from "../model-router/providerHubShadowRouteTrace";
import type { OperationCenterItem } from "./operationCenterTypes";

export function createProviderHubShadowRouteTraceItem(trace: LucaProviderHubShadowRouteTrace): OperationCenterItem {
  const current = trace.currentProviderId ? `${trace.currentProviderId}${trace.currentModelId ? ` / ${trace.currentModelId}` : ""}` : "unavailable";
  const planned = trace.providerHubSelectedProviderId ? `${trace.providerHubSelectedProviderId}${trace.providerHubSelectedModelId ? ` / ${trace.providerHubSelectedModelId}` : ""}` : "none";
  return {
    itemId: `operation:${trace.traceId}`,
    source: "provider_hub",
    category: "model_mesh",
    title: "Provider Hub shadow route trace",
    summary: `${summarizeProviderHubShadowRouteTrace(trace)} Current route: ${current}; planned route: ${planned}; trigger: ${trace.trigger}.`,
    status: trace.matchesCurrentRoute ? "ready_for_review" : "approval_required",
    riskLevel: trace.matchesCurrentRoute ? "low" : "medium",
    createdAt: trace.observedAt,
    relatedTraceId: trace.traceId,
    requiredApprovals: [],
    blockedActions: [
      "ProviderFactory execution",
      "runtime route switch",
      "provider API call",
      "connection test",
      "settings write",
    ],
    warnings: trace.matchesCurrentRoute ? ["Shadow trace is diagnostic only and cannot execute."] : [trace.mismatchReason ?? "Current runtime route differs from Provider Hub planner.", "Shadow trace is diagnostic only and cannot execute."],
    blockers: [],
    auditSummary: [
      `traceId=${trace.traceId}`,
      `trigger=${trace.trigger}`,
      `currentRoute=${current}`,
      `plannedRoute=${planned}`,
      `matchesCurrentRoute=${trace.matchesCurrentRoute}`,
      `decisionStatus=${trace.providerHubDecisionStatus}`,
      `candidateCount=${trace.candidateCount}`,
      `fallbackCandidateCount=${trace.fallbackCandidateCount}`,
      `blockedCandidateCount=${trace.blockedCandidateCount}`,
      `safeDiagnostics=${trace.safeDiagnosticsText}`,
      "sideEffectsPerformed=false",
      "runtimeRoutingChanged=false",
      "providerApiCalled=false",
      "canExecute=false",
      "executionEnabled=false",
      "readyForExecution=false",
    ].join("; "),
    sideEffectsPerformed: false,
    authorityGranted: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
  };
}

export function createProviderHubShadowRouteTraceItems(trace: LucaProviderHubShadowRouteTrace): OperationCenterItem[] {
  return [createProviderHubShadowRouteTraceItem(trace)];
}
