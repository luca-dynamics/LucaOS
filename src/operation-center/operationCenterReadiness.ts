import type { OperationCenterItem, OperationCenterReadiness, OperationCenterSummary } from "./operationCenterTypes";

const unique = (values: readonly string[]) => [...new Set(values.filter(Boolean))];

export function summarizeOperationCenterItems(items: readonly OperationCenterItem[]): OperationCenterSummary {
  const count = (status: OperationCenterItem["status"]) => items.filter((item) => item.status === status).length;
  return {
    totalItems: items.length,
    pending: count("pending"),
    approvalRequired: count("approval_required"),
    grantedForReview: count("granted_for_review"),
    denied: count("denied"),
    expired: count("expired"),
    blocked: count("blocked"),
    unsupported: count("unsupported"),
    modelOnly: count("model_only"),
    readOnly: count("read_only"),
    disabled: count("disabled"),
    personalIntelligenceCount: items.filter((item) => item.source === "personal_intelligence").length,
    lucaLinkCount: items.filter((item) => item.source === "lucalink").length,
    highRiskCount: items.filter((item) => item.riskLevel === "high").length,
    criticalRiskCount: items.filter((item) => item.riskLevel === "critical").length,
    authorityGranted: false,
    readyForExecution: false,
    executionEnabled: false,
    canExecute: false,
    readyForLiveSend: false,
    writeEnabled: false,
    installEnabled: false,
    liveCollectionEnabled: false,
    sideEffectsPerformed: false,
    warnings: unique(items.flatMap((item) => item.warnings)),
    blockers: unique(items.flatMap((item) => item.blockers)),
  };
}

export function evaluateOperationCenterReadiness(items: readonly OperationCenterItem[]): OperationCenterReadiness {
  const summary = summarizeOperationCenterItems(items);
  return {
    ...summary,
    topPendingApprovals: items
      .filter((item) => item.status === "pending" || item.status === "approval_required")
      .sort((a, b) => riskRank(b.riskLevel) - riskRank(a.riskLevel))
      .slice(0, 5),
    topBlockedActions: unique(items.flatMap((item) => item.blockedActions)).slice(0, 5),
  };
}

function riskRank(risk: OperationCenterItem["riskLevel"]): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[risk];
}
