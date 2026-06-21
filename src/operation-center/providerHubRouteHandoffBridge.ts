import type { LucaProviderHubRouteHandoffResult } from "../model-router/providerHubProviderFactoryRouteHandoff";
import type { OperationCenterItem } from "./operationCenterTypes";

const PROVIDER_HUB_ROUTE_HANDOFF_TIME = "2026-06-21T12:30:00.000Z";

function describeRoute(route: LucaProviderHubRouteHandoffResult["handoffRoute"]): string {
  if (route.kind === "LOCAL") return `${route.kind}:${route.runtime}:${route.model}`;
  return `${route.kind}:${route.provider}:${route.model}`;
}

export function createProviderHubRouteHandoffGuardItems(handoff: LucaProviderHubRouteHandoffResult): OperationCenterItem[] {
  const selected = handoff.selectedProviderId ? `${handoff.selectedProviderId}${handoff.selectedModelId ? ` / ${handoff.selectedModelId}` : ""}` : "none";
  const actualRoute = handoff.shouldUseProviderHubRoute ? handoff.handoffRoute : handoff.fallbackRoute;
  return [{
    itemId: `operation:provider-hub:provider-factory-route-handoff:${handoff.handoffStatus}`,
    source: "provider_hub",
    category: "model_mesh",
    title: "Provider Hub route handoff guard",
    summary: `Guarded route handoff. Flag enabled: ${handoff.handoffStatus !== "disabled"}; handoff status: ${handoff.handoffStatus}; selected Provider Hub route: ${selected}; fallback reason: ${handoff.shouldUseProviderHubRoute ? "none" : handoff.reason}; actual ProviderFactory route selected: ${describeRoute(actualRoute)}.`,
    status: "ready_for_review",
    riskLevel: handoff.handoffStatus === "mapped" ? "medium" : "low",
    createdAt: PROVIDER_HUB_ROUTE_HANDOFF_TIME,
    requiredApprovals: [],
    blockedActions: ["direct provider API call", "automatic connection test", "provider adapter instantiation outside ProviderFactory", "local runtime startup", "settings write"],
    warnings: ["Execution remains disabled for this Operation Center item; existing ProviderFactory adapter creation is the only execution path."],
    blockers: [],
    auditSummary: [
      handoff.safeDiagnosticsText,
      `flagEnabled=${handoff.handoffStatus !== "disabled"}`,
      `handoffStatus=${handoff.handoffStatus}`,
      `selectedProviderModel=${selected}`,
      `fallbackReason=${handoff.shouldUseProviderHubRoute ? "none" : handoff.reason}`,
      `actualProviderFactoryRoute=${describeRoute(actualRoute)}`,
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
