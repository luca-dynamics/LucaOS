import type { LucaProviderHubTaskRoutePolicyResolution } from "../model-router/providerHubTaskRoutePolicies";
import { createProviderHubTaskRoutePolicyDiagnostics } from "../model-router/providerHubTaskRoutePolicies";
import type { OperationCenterItem } from "./operationCenterTypes";

const POLICY_TIME = "2026-06-21T12:00:00.000Z";

export function createProviderHubTaskRoutePolicyItems(policy: LucaProviderHubTaskRoutePolicyResolution): OperationCenterItem[] {
  return [{
    itemId: `operation:provider-hub:task-route-policy:${policy.taskType}`,
    source: "provider_hub",
    category: "model_mesh",
    title: "Provider Hub task route policy",
    summary: `Read-only task route policy for ${policy.taskType}; required capabilities: ${policy.requiredCapabilities.join(", ")}; preference: ${policy.preference}; local=${policy.allowLocalProviders}; cloud=${policy.allowCloudProviders}; fallbacks=${policy.allowFallbacks}.`,
    status: "read_only",
    riskLevel: "low",
    createdAt: POLICY_TIME,
    requiredApprovals: [],
    blockedActions: ["provider API call", "automatic connection test", "provider adapter instantiation", "local runtime startup", "settings write", "MCP/action execution"],
    warnings: [...policy.safetyNotes],
    blockers: [],
    auditSummary: `${createProviderHubTaskRoutePolicyDiagnostics(policy)}; canExecute=false; sideEffectsPerformed=false`,
    sideEffectsPerformed: false,
    authorityGranted: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
  }];
}
