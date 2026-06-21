import type { LucaProviderHubTaskRouteDiagnosticsMatrix } from "../model-router/providerHubTaskRouteDiagnosticsMatrix";
import { summarizeProviderHubTaskRouteDiagnosticsMatrix } from "../model-router/providerHubTaskRouteDiagnosticsMatrix";
import type { OperationCenterItem } from "./operationCenterTypes";

export function createProviderHubTaskRouteDiagnosticsMatrixItems(matrix: LucaProviderHubTaskRouteDiagnosticsMatrix): OperationCenterItem[] {
  return [{
    itemId: `operation:provider-hub:task-route-diagnostics-matrix:${matrix.observedAt}`,
    source: "provider_hub",
    category: "model_mesh",
    title: "Provider Hub task route diagnostics matrix",
    summary: summarizeProviderHubTaskRouteDiagnosticsMatrix(matrix),
    status: "read_only",
    riskLevel: "low",
    createdAt: matrix.observedAt,
    requiredApprovals: [],
    blockedActions: ["provider API call", "automatic connection test", "runtime route switch", "provider adapter instantiation", "local runtime startup", "MCP/action execution"],
    warnings: ["Diagnostics matrix is read-only and does not route voice, memory, vision, code, or tool planning through Provider Hub."],
    blockers: [],
    auditSummary: `${matrix.safeDiagnosticsText}; canExecute=false; executionEnabled=false; sideEffectsPerformed=false`,
    sideEffectsPerformed: false,
    authorityGranted: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
  }];
}
