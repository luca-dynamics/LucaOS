/**
 * Provider Hub route preview Operation Center bridge.
 *
 * Pure read-only diagnostics only. This bridge maps an already-created route
 * decision into Operation Center evidence and never executes providers, starts
 * runtimes, writes settings, or changes routing.
 */
import type { LucaProviderHubRouteDecision } from "../model-router/providerHubRoutePlanner";
import type { OperationCenterItem, OperationCenterStatus } from "./operationCenterTypes";

const ROUTE_TRACE_TIME = "2026-06-07T12:00:00.000Z";

function statusForDecision(decision: LucaProviderHubRouteDecision): OperationCenterStatus {
  if (decision.status === "selected" || decision.status === "fallback_selected") return "read_only";
  if (decision.status === "no_supported_provider") return "unsupported";
  return "blocked";
}

export function createProviderHubRouteTraceItems(decision: LucaProviderHubRouteDecision): OperationCenterItem[] {
  const status = statusForDecision(decision);
  const selectedProvider = decision.selectedProviderLabel ?? decision.selectedProviderId ?? "none";
  const selectedModel = decision.selectedModelId ?? "none";
  const safeAuditSummary = [
    `taskType=${decision.taskType}`,
    `preference=${decision.preference}`,
    `selectedProvider=${decision.selectedProviderId ?? "none"}`,
    `selectedModelId=${selectedModel}`,
    `decisionStatus=${decision.status}`,
    `fallbackCount=${decision.fallbackCandidates.length}`,
    `blockedCount=${decision.blockedCandidates.length}`,
    `safeDiagnostics=${decision.safeDiagnosticsText}`,
    "sideEffectsPerformed=false",
    "canExecute=false",
    "executionEnabled=false",
  ].join("; ");

  return [{
    itemId: `operation:provider-hub:route-preview:${decision.taskType}:${decision.preference}`,
    source: "provider_hub",
    category: "model_mesh",
    title: "Provider Hub route preview",
    summary: `Read-only route preview for ${decision.taskType} using ${decision.preference}; selected provider: ${selectedProvider}; selected model: ${selectedModel}; decision status: ${decision.status}; fallback candidates: ${decision.fallbackCandidates.length}; blocked candidates: ${decision.blockedCandidates.length}. ${decision.reason}`,
    status,
    riskLevel: status === "read_only" ? "low" : "medium",
    createdAt: ROUTE_TRACE_TIME,
    requiredApprovals: [],
    blockedActions: ["provider runtime execution", "provider adapter instantiation", "provider API call", "settings write", "runtime routing change"],
    warnings: ["Route preview is diagnostic only and does not change runtime routing."],
    blockers: status === "read_only" ? [] : [decision.reason],
    auditSummary: safeAuditSummary,
    sideEffectsPerformed: false,
    authorityGranted: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
  }];
}
