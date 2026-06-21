import type { LucaProviderFactoryExecutionFallbackResult } from "../services/llm/ProviderFactory";
import type { OperationCenterItem } from "./operationCenterTypes";

const PROVIDER_HUB_EXECUTION_FALLBACK_TIME = "2026-06-21T13:00:00.000Z";

function describeRoute(route: LucaProviderFactoryExecutionFallbackResult["attemptedRoute"]): string {
  if (route.kind === "LOCAL") return `${route.kind}:${route.runtime}:${route.model}`;
  return `${route.kind}:${route.provider}:${route.model}`;
}

export function createProviderHubExecutionFallbackGuardItems(result: LucaProviderFactoryExecutionFallbackResult): OperationCenterItem[] {
  const attempted = describeRoute(result.attemptedRoute);
  const fallback = result.fallbackRoute ? describeRoute(result.fallbackRoute) : "none";
  return [{
    itemId: `operation:provider-hub:provider-factory-execution-fallback:${result.trigger ?? "none"}`,
    source: "provider_hub",
    category: "model_mesh",
    title: "ProviderFactory execution-time fallback guard",
    summary: `Execution-time fallback guard. Attempted route: ${attempted}; fallback route: ${fallback}; fallback attempted: ${result.fallbackAttempted}; fallback used: ${result.fallbackUsed}; trigger: ${result.trigger ?? "none"}; sanitized error: ${result.sanitizedErrorMessage ?? "none"}; loop prevented: ${result.fallbackLoopPrevented}.`,
    status: "ready_for_review",
    riskLevel: result.fallbackUsed ? "medium" : "low",
    createdAt: PROVIDER_HUB_EXECUTION_FALLBACK_TIME,
    requiredApprovals: [],
    blockedActions: ["direct provider API call", "automatic connection test", "local runtime startup", "fallback loop", "settings write"],
    warnings: ["Operation Center item is diagnostics-only; ProviderFactory remains the only execution owner."],
    blockers: [],
    auditSummary: [
      result.safeDiagnosticsText,
      `attemptedRoute=${attempted}`,
      `fallbackRoute=${fallback}`,
      `fallbackAttempted=${result.fallbackAttempted}`,
      `fallbackUsed=${result.fallbackUsed}`,
      `trigger=${result.trigger ?? "none"}`,
      `sanitizedError=${result.sanitizedErrorMessage ?? "none"}`,
      `fallbackLoopPrevented=${result.fallbackLoopPrevented}`,
      `sideEffectsPerformed=${result.sideEffectsPerformed}`,
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
