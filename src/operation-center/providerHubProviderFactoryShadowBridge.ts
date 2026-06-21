import type { LucaProviderFactoryShadowSelection } from "../model-router/providerHubProviderFactoryShadowHook";
import type { OperationCenterItem } from "./operationCenterTypes";

const PROVIDER_FACTORY_SHADOW_TIME = "2026-06-20T12:30:00.000Z";

export function createProviderFactoryShadowSelectionOperationItems(selection: LucaProviderFactoryShadowSelection): OperationCenterItem[] {
  const current = selection.currentProviderId ? `${selection.currentProviderId}${selection.currentModelId ? ` / ${selection.currentModelId}` : ""}` : "unavailable";
  const planned = selection.providerHubSelectedProviderId ? `${selection.providerHubSelectedProviderId}${selection.providerHubSelectedModelId ? ` / ${selection.providerHubSelectedModelId}` : ""}` : "none";
  return [{
    itemId: `operation:provider-hub:provider-factory-shadow-selection:${selection.decisionStatus}`,
    source: "provider_hub",
    category: "model_mesh",
    title: "ProviderFactory shadow selection hook",
    summary: `Read-only ProviderFactory shadow route trace. Current ProviderFactory route: ${current}; Provider Hub selected route: ${planned}; flag enabled: ${selection.providerHubEnabled}; shouldUseProviderHubRoute=${selection.shouldUseProviderHubRoute}; actual runtime unchanged. ${selection.reason}`,
    status: "ready_for_review",
    riskLevel: selection.providerHubEnabled && !selection.matchesCurrentRoute ? "medium" : "low",
    createdAt: PROVIDER_FACTORY_SHADOW_TIME,
    requiredApprovals: [],
    blockedActions: ["ProviderFactory execution change", "provider adapter replacement", "provider API call", "automatic connection test", "local runtime startup", "settings write"],
    warnings: ["Shadow selection only; ProviderFactory adapter creation and prompt execution remain unchanged."],
    blockers: [],
    auditSummary: [
      selection.safeDiagnosticsText,
      `currentProviderFactoryRoute=${current}`,
      `providerHubSelectedRoute=${planned}`,
      `flagEnabled=${selection.providerHubEnabled}`,
      `shouldUseProviderHubRoute=${selection.shouldUseProviderHubRoute}`,
      `runtimeExecutionChanged=${selection.runtimeExecutionChanged}`,
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
