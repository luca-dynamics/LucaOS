import type { LucaProviderFactoryFinalRouteDecision, ModelProvisioningRoute } from "../services/llm/ProviderFactory";
import type { OperationCenterItem } from "./operationCenterTypes";

const PROVIDER_FACTORY_FINAL_ROUTE_TIME = "2026-06-21T12:45:00.000Z";

function describeRoute(route: ModelProvisioningRoute | undefined): string {
  if (!route) return "none";
  if (route.kind === "LOCAL") return `${route.kind}:${route.runtime}:${route.model}`;
  return `${route.kind}:${route.provider}:${route.model}`;
}

export function createProviderFactoryFinalRouteGuardItems(decision: LucaProviderFactoryFinalRouteDecision): OperationCenterItem[] {
  return [{
    itemId: `operation:provider-hub:provider-factory-final-route:${decision.handoffStatus}:${decision.usedProviderHubHandoff ? "handoff" : "fallback"}`,
    source: "provider_hub",
    category: "model_mesh",
    title: "ProviderFactory final route guard",
    summary: `Current route: ${describeRoute(decision.currentRoute)}; handoff route: ${describeRoute(decision.handoffRoute)}; final route: ${describeRoute(decision.finalRoute)}; Provider Hub handoff used: ${decision.usedProviderHubHandoff}; handoff status: ${decision.handoffStatus}; fallback reason: ${decision.fallbackReason ?? "none"}.`,
    status: "ready_for_review",
    riskLevel: decision.usedProviderHubHandoff ? "medium" : "low",
    createdAt: PROVIDER_FACTORY_FINAL_ROUTE_TIME,
    requiredApprovals: [],
    blockedActions: ["direct provider API call", "automatic connection test", "provider adapter instantiation outside ProviderFactory", "local runtime startup", "settings write"],
    warnings: ["This item is read-only; actual adapter creation remains constrained to ProviderFactory createProviderForRoute(...)."],
    blockers: [],
    auditSummary: [
      decision.safeDiagnosticsText,
      `currentRoute=${describeRoute(decision.currentRoute)}`,
      `handoffRoute=${describeRoute(decision.handoffRoute)}`,
      `finalRoute=${describeRoute(decision.finalRoute)}`,
      `usedProviderHubHandoff=${decision.usedProviderHubHandoff}`,
      `handoffStatus=${decision.handoffStatus}`,
      `fallbackReason=${decision.fallbackReason ?? "none"}`,
      `runtimeExecutionChanged=${decision.runtimeExecutionChanged}`,
      "providerApiCalledDuringSelection=false",
      "providerAdapterInstantiatedByHandoffMapper=false",
      "sideEffectsPerformed=false",
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
