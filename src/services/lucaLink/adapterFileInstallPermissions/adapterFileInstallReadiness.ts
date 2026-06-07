import type { LucaLinkAdapterFileInstallPermissionDecision, LucaLinkAdapterFileInstallPermissionRequest } from "./adapterFileInstallTypes";

export interface LucaLinkAdapterFileInstallPermissionReadiness {
  totalRequests: number;
  fileWriteRequests: number;
  installRequests: number;
  readyForReview: number;
  approvalRequired: number;
  blocked: number;
  expired: number;
  unsupported: number;
  writeEnabled: false;
  installEnabled: false;
  readyForExecution: false;
  highRiskCount: number;
  criticalRiskCount: number;
  missingProvenanceCount: number;
  missingRollbackCount: number;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export function summarizeAdapterFileInstallPermissionReadiness(requests: readonly LucaLinkAdapterFileInstallPermissionRequest[], decisions: readonly LucaLinkAdapterFileInstallPermissionDecision[]): LucaLinkAdapterFileInstallPermissionReadiness {
  const count = (status: LucaLinkAdapterFileInstallPermissionDecision["status"]) => decisions.filter((item) => item.status === status).length;
  return {
    totalRequests: requests.length,
    fileWriteRequests: requests.filter((item) => item.operation === "file_write").length,
    installRequests: requests.filter((item) => item.operation === "install").length,
    readyForReview: count("ready_for_review"),
    approvalRequired: count("approval_required"),
    blocked: count("blocked"),
    expired: count("expired"),
    unsupported: count("unsupported"),
    writeEnabled: false,
    installEnabled: false,
    readyForExecution: false,
    highRiskCount: requests.filter((item) => item.riskLevel === "high").length,
    criticalRiskCount: requests.filter((item) => item.riskLevel === "critical").length,
    missingProvenanceCount: requests.filter((item) => !item.provenance || !item.hash || !item.signature).length,
    missingRollbackCount: requests.filter((item) => item.operation === "file_write" ? !item.rollbackPlanSummary : !item.rollbackPlanSummary || !item.uninstallPlanSummary).length,
    warnings: Array.from(new Set([...requests.flatMap((item) => item.warnings), ...decisions.flatMap((item) => item.warnings)])),
    blockers: Array.from(new Set([...requests.flatMap((item) => item.blockers), ...decisions.flatMap((item) => item.blockers)])),
    sideEffectsPerformed: false,
  };
}
