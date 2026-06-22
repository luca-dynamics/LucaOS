import type { LucaProviderHubCodeRuntimeGuardSummary, ModelProvisioningRoute } from "../services/llm/ProviderFactory";
import type { OperationCenterItem } from "./operationCenterTypes";

const PROVIDER_HUB_CODE_RUNTIME_GUARD_TIME = "2026-06-22T13:30:00.000Z";

function describeRoute(route: ModelProvisioningRoute | undefined): string {
  if (!route) return "none";
  if (route.kind === "LOCAL") return `${route.kind}:${route.runtime}:${route.model}`;
  return `${route.kind}:${route.provider}:${route.model}`;
}

export function createProviderHubCodeRuntimeGuardItems(summary: LucaProviderHubCodeRuntimeGuardSummary): OperationCenterItem[] {
  return [{
    itemId: `operation:provider-hub:code-runtime-guard:${summary.routeSource}`,
    source: "provider_hub",
    category: "model_mesh",
    title: "Provider Hub code generation runtime guard",
    summary: `Code Generation task policy ${summary.taskType}; required capability: ${summary.requiredCapabilities.join(",")}; preference: ${summary.preference}; selected/final provider route: ${describeRoute(summary.finalRoute)}; current route: ${describeRoute(summary.currentRoute)}; handoff route: ${describeRoute(summary.handoffRoute)}; route source: ${summary.routeSource}; fallback reason: ${summary.fallbackReasonCode ?? "none"}; kill switch enabled: ${summary.runtimeRouteKillSwitchEnabled}; tool/file/terminal execution: false/false/false.`,
    status: "ready_for_review",
    riskLevel: summary.routeSource === "provider_hub_handoff" ? "medium" : "low",
    createdAt: PROVIDER_HUB_CODE_RUNTIME_GUARD_TIME,
    requiredApprovals: [],
    blockedActions: ["direct provider API call", "automatic connection test", "local runtime startup", "tool execution", "MCP/action execution", "file mutation", "terminal command execution", "non-code runtime expansion"],
    warnings: ["Read-only Code Generation diagnostics; code generation is output-only and ProviderFactory remains the only execution owner."],
    blockers: [],
    auditSummary: [
      summary.safeDiagnosticsText,
      `taskType=${summary.taskType}`,
      `requiredCapabilities=${summary.requiredCapabilities.join(",")}`,
      `preference=${summary.preference}`,
      `currentRoute=${describeRoute(summary.currentRoute)}`,
      `handoffRoute=${describeRoute(summary.handoffRoute)}`,
      `finalRoute=${describeRoute(summary.finalRoute)}`,
      `routeSource=${summary.routeSource}`,
      `fallbackReasonCode=${summary.fallbackReasonCode ?? "none"}`,
      `killSwitchEnabled=${summary.runtimeRouteKillSwitchEnabled}`,
      `executionFallbackUsed=${summary.executionFallbackStatus?.fallbackUsed ?? false}`,
      "providerApiCalledDuringSelection=false",
      "automaticConnectionTestStarted=false",
      "localRuntimeStarted=false",
      "toolExecutionPerformed=false",
      "fileMutationPerformed=false",
      "terminalCommandExecuted=false",
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
