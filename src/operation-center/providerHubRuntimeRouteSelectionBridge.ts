import type { LucaProviderHubRuntimeRouteSelectionResult } from "../model-router/providerHubRuntimeRouteSelection";
import type { OperationCenterItem } from "./operationCenterTypes";

const RUNTIME_SELECTION_GUARD_TIME = "2026-06-20T12:00:00.000Z";

export function createProviderHubRuntimeRouteSelectionGuardItems(selection: LucaProviderHubRuntimeRouteSelectionResult): OperationCenterItem[] {
  const enabled = selection.enabled;
  return [{
    itemId: "operation:provider-hub:runtime-route-selection-guard",
    source: "provider_hub",
    category: "model_mesh",
    title: "Provider Hub runtime route selection guard",
    summary: enabled
      ? `Provider Hub runtime route selection flag is enabled for guarded route selection review; shouldUseProviderHubRoute=${selection.shouldUseProviderHubRoute}; status=${selection.decisionStatus}. ${selection.reason}`
      : "Provider Hub runtime route selection flag is disabled/default; existing ProviderFactory runtime routing remains active.",
    status: enabled ? "ready_for_review" : "ready_for_review",
    riskLevel: enabled ? "medium" : "low",
    createdAt: RUNTIME_SELECTION_GUARD_TIME,
    requiredApprovals: [],
    blockedActions: ["provider runtime execution", "provider adapter instantiation", "provider API call", "automatic connection test", "local runtime startup"],
    warnings: enabled ? ["Runtime route selection guard is enabled for review; Provider Hub still does not execute providers."] : [],
    blockers: [],
    auditSummary: [
      `enabled=${selection.enabled}`,
      `decisionStatus=${selection.decisionStatus}`,
      `shouldUseProviderHubRoute=${selection.shouldUseProviderHubRoute}`,
      `fallbackToCurrentRuntime=${selection.fallbackToCurrentRuntime}`,
      `sideEffectsPerformed=${selection.sideEffectsPerformed}`,
      "executionEnabled=false",
      "canExecute=false",
    ].join("; "),
    sideEffectsPerformed: false,
    authorityGranted: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
  }];
}
