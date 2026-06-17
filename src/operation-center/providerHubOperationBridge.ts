/**
 * Provider Hub Operation Center bridge.
 *
 * Read-only diagnostics only: this module maps Provider Hub readiness results
 * into Operation Center items. It does not import runtime factories, instantiate
 * adapters, test connections, read secrets, or call provider APIs.
 */
import { createProviderHubDiagnosticsText } from "../model-router/providerHubPanelViewModel";
import { getProviderHubEntry } from "../model-router/providerHubRegistry";
import {
  evaluateProviderHubReadinessForAll,
  summarizeProviderHubReadiness,
  type LucaProviderHubConnectionSnapshot,
  type LucaProviderHubReadinessResult,
} from "../model-router/providerHubReadiness";
import type { OperationCenterItem, OperationCenterStatus } from "./operationCenterTypes";

const FIXTURE_TIME = "2026-06-07T12:00:00.000Z";

const readinessStatusMap: Record<LucaProviderHubReadinessResult["state"], OperationCenterStatus> = {
  ready: "read_only",
  missing_user_key: "pending",
  missing_base_url: "pending",
  local_runtime_unavailable: "pending",
  disabled: "disabled",
  unknown: "unsupported",
  unsupported_task: "unsupported",
  unsupported_capability: "unsupported",
};

function actionLabel(action: LucaProviderHubReadinessResult["requiredAction"]): string {
  return action.replace(/_/g, " ");
}

function createReadOnlyProviderHubItem(input: {
  readonly itemId: string;
  readonly title: string;
  readonly summary: string;
  readonly status: OperationCenterStatus;
  readonly warnings?: readonly string[];
  readonly blockers?: readonly string[];
  readonly auditSummary?: string;
}): OperationCenterItem {
  return {
    itemId: input.itemId,
    source: "provider_hub",
    category: "provider_readiness",
    title: input.title,
    summary: input.summary,
    status: input.status,
    riskLevel: input.status === "read_only" ? "low" : "medium",
    createdAt: FIXTURE_TIME,
    requiredApprovals: [],
    blockedActions: ["provider runtime execution", "provider adapter instantiation", "provider API call", "settings write"],
    warnings: [...(input.warnings ?? [])],
    blockers: [...(input.blockers ?? [])],
    auditSummary: input.auditSummary,
    sideEffectsPerformed: false,
    authorityGranted: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
  };
}

export function createProviderHubOperationItemsFromReadiness(
  results: readonly LucaProviderHubReadinessResult[],
  snapshots: readonly LucaProviderHubConnectionSnapshot[] = [],
): OperationCenterItem[] {
  const snapshotByProvider = new Map(snapshots.map((snapshot) => [snapshot.providerId, snapshot]));
  const summary = summarizeProviderHubReadiness(results);
  const items: OperationCenterItem[] = [createReadOnlyProviderHubItem({
    itemId: "operation:provider-hub:summary",
    title: "Provider Hub readiness summary",
    summary: `${summary.readyProviders}/${summary.totalProviders} providers ready; ${summary.providersRequiringAction} require read-only setup action. Routing posture remains diagnostic only.`,
    status: summary.providersRequiringAction > 0 ? "read_only" : "read_only",
    warnings: ["Provider Hub diagnostics do not change runtime routing or test provider connections."],
    auditSummary: `ready=${summary.readyProviders}; actionRequired=${summary.providersRequiringAction}; sideEffectsPerformed=false`,
  })];

  for (const result of results) {
    const entry = getProviderHubEntry(result.providerId);
    const configuredModelId = snapshotByProvider.get(result.providerId)?.configuredModelId;
    const modelText = configuredModelId ? ` Selected model: ${configuredModelId}.` : "";
    const diagnosticsText = [
      createProviderHubDiagnosticsText(result, entry),
      `selectedModelId=${configuredModelId ?? "none"}`,
    ].join("\n");

    items.push(createReadOnlyProviderHubItem({
      itemId: `operation:provider-hub:${result.providerId}`,
      title: result.ready
        ? `${entry.label} ready`
        : `${entry.label} ${actionLabel(result.requiredAction)}`,
      summary: `${result.reason}${modelText} Provider category: ${entry.category}; supported tasks: ${result.supportedTaskTypes.join(", ") || "none"}; missing capabilities: ${result.missingCapabilities.join(", ") || "none"}; cost tier: ${entry.defaultCostTier}; latency fit: ${entry.defaultLatencyFit}; privacy fit: ${entry.privacyFit}.`,
      status: readinessStatusMap[result.state],
      warnings: result.ready ? [] : [`Required action: ${actionLabel(result.requiredAction)}`],
      blockers: result.ready ? [] : [result.reason],
      auditSummary: diagnosticsText,
    }));
  }

  return items;
}

export function createProviderHubOperationItems(
  connectionSnapshots: readonly LucaProviderHubConnectionSnapshot[] = [],
): OperationCenterItem[] {
  return createProviderHubOperationItemsFromReadiness(
    evaluateProviderHubReadinessForAll({ connectionSnapshots }),
    connectionSnapshots,
  );
}
