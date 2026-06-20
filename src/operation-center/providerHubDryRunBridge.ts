/** ProviderFactory dry-run comparison Operation Center bridge. */
import type { LucaProviderFactoryDryRunComparison } from "../model-router/providerHubProviderFactoryDryRun";
import type { OperationCenterItem } from "./operationCenterTypes";

const DRY_RUN_TIME = "2026-06-07T12:00:00.000Z";

export function createProviderFactoryDryRunOperationItems(comparison: LucaProviderFactoryDryRunComparison): OperationCenterItem[] {
  const current = comparison.currentProviderId ?? "unavailable";
  const planned = comparison.providerHubSelectedProviderId ?? "none";
  return [{
    itemId: `operation:provider-hub:provider-factory-dry-run:${comparison.providerHubDecisionStatus}`,
    source: "provider_hub",
    category: "model_mesh",
    title: "ProviderFactory dry-run comparison",
    summary: `Read-only dry-run comparison. Current runtime provider: ${current}; Provider Hub planned provider: ${planned}; match: ${comparison.matchesCurrentRoute}; status: ${comparison.providerHubDecisionStatus}. ${comparison.mismatchReason ?? comparison.providerHubReason}`,
    status: "ready_for_review",
    riskLevel: comparison.matchesCurrentRoute ? "low" : "medium",
    createdAt: DRY_RUN_TIME,
    requiredApprovals: [],
    blockedActions: ["ProviderFactory execution", "provider adapter import", "provider API call", "connection test", "settings write", "runtime routing change"],
    warnings: ["Dry-run comparison only; actual ProviderFactory routing remains unchanged."],
    blockers: [],
    auditSummary: `${comparison.safeDiagnosticsText}; canExecute=false; executionEnabled=false; sideEffectsPerformed=false`,
    sideEffectsPerformed: false,
    authorityGranted: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
  }];
}
