import type { LucaProviderFactoryFinalRouteDecision, ModelProvisioningRoute } from "../services/llm/ProviderFactory";
import type { OperationCenterItem } from "./operationCenterTypes";

const PROVIDER_FACTORY_FINAL_ROUTE_TIME = "2026-06-21T12:45:00.000Z";

function describeRoute(route: ModelProvisioningRoute | undefined): string {
  if (!route) return "none";
  if (route.kind === "LOCAL") return `${route.kind}:${route.runtime}:${route.model}`;
  return `${route.kind}:${route.provider}:${route.model}`;
}

export function createProviderFactoryFinalRouteGuardItems(decision: LucaProviderFactoryFinalRouteDecision): OperationCenterItem[] {
  const finalRouteGuard: OperationCenterItem = {
    itemId: `operation:provider-hub:provider-factory-final-route:${decision.handoffStatus}:${decision.usedProviderHubHandoff ? "handoff" : "fallback"}`,
    source: "provider_hub",
    category: "model_mesh",
    title: "ProviderFactory final route guard",
    summary: `Current route: ${describeRoute(decision.currentRoute)}; handoff route: ${describeRoute(decision.handoffRoute)}; final route: ${describeRoute(decision.finalRoute)}; Provider Hub handoff used: ${decision.usedProviderHubHandoff}; route source: ${decision.routeSource}; handoff status: ${decision.handoffStatus}; fallback reason code: ${decision.fallbackReasonCode ?? "none"}; fallback reason: ${decision.fallbackReason ?? "none"}; disabling flag restores current route: ${decision.flagDisabledRestoresCurrentRoute}.`,
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
      `routeSource=${decision.routeSource}`,
      `flagDisabledRestoresCurrentRoute=${decision.flagDisabledRestoresCurrentRoute}`,
      `handoffStatus=${decision.handoffStatus}`,
      `fallbackReasonCode=${decision.fallbackReasonCode ?? "none"}`,
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
  };

  const killSwitchItem: OperationCenterItem = {
    itemId: "operation:provider-hub:emergency-runtime-kill-switch",
    source: "provider_hub",
    category: "model_mesh",
    title: "Provider Hub emergency runtime kill switch",
    summary: `Provider Hub emergency runtime kill switch is ${decision.runtimeRouteKillSwitchEnabled ? "enabled" : "disabled"}; overrides runtime route selection: ${decision.runtimeRouteKillSwitchEnabled && decision.runtimeRouteSelectionEnabled}; current route forced: ${decision.killSwitchForcedCurrentRoute}; Provider Hub handoff ignored: ${decision.killSwitchForcedCurrentRoute && !decision.usedProviderHubHandoff}; canExecute false; sideEffectsPerformed false.`,
    status: "ready_for_review",
    riskLevel: decision.runtimeRouteKillSwitchEnabled ? "high" : "low",
    createdAt: PROVIDER_FACTORY_FINAL_ROUTE_TIME,
    requiredApprovals: [],
    blockedActions: ["direct provider API call", "automatic connection test", "Provider Hub runtime handoff", "local runtime startup", "settings write"],
    warnings: decision.runtimeRouteKillSwitchEnabled ? ["Provider Hub runtime kill switch active; using current ProviderFactory route."] : [],
    blockers: [],
    auditSummary: [
      `enabled=${decision.runtimeRouteKillSwitchEnabled}`,
      `overridesRuntimeRouteSelection=${decision.runtimeRouteKillSwitchEnabled && decision.runtimeRouteSelectionEnabled}`,
      `currentRouteForced=${decision.killSwitchForcedCurrentRoute}`,
      `providerHubHandoffIgnored=${decision.killSwitchForcedCurrentRoute && !decision.usedProviderHubHandoff}`,
      `routeSource=${decision.routeSource}`,
      `fallbackReasonCode=${decision.fallbackReasonCode ?? "none"}`,
      "canExecute=false",
      "sideEffectsPerformed=false",
    ].join("; "),
    sideEffectsPerformed: false,
    authorityGranted: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
  };

  return [finalRouteGuard, killSwitchItem];
}
