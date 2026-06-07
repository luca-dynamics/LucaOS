import type {
  LucaLinkAdapterFileInstallApprovalRequirement,
  LucaLinkAdapterFileInstallEvaluationOptions,
  LucaLinkAdapterFileInstallPermissionDecision,
  LucaLinkAdapterFileInstallPermissionRequest,
  LucaLinkAdapterFileInstallRequiredEvidenceItem,
} from "./adapterFileInstallTypes";
import { evaluateLucaLinkAdapterFileWritePolicy } from "./adapterFileWritePolicy";
import { evaluateLucaLinkAdapterInstallPolicy } from "./adapterInstallPolicy";

const RISK_RANK = { low: 0, medium: 1, high: 2, critical: 3 } as const;

export function createAdapterFileInstallRequiredEvidence(
  request: LucaLinkAdapterFileInstallPermissionRequest,
): LucaLinkAdapterFileInstallRequiredEvidenceItem[] {
  const evidence: LucaLinkAdapterFileInstallRequiredEvidenceItem[] = [
    { kind: "provenance", present: Boolean(request.provenance.trim()), summary: "Declarative source provenance" },
    { kind: "hash", present: Boolean(request.hash), summary: "Content or package digest metadata" },
    { kind: "signature", present: Boolean(request.signature), summary: "Signature metadata" },
    { kind: "privacy_review", present: request.privacyLevel !== "sensitive", summary: `Privacy classification: ${request.privacyLevel}` },
    { kind: "explicit_user_approval", present: request.approvalSatisfied, summary: "Explicit approval metadata; never execution authority" },
    { kind: "primary_host_approval", present: request.approvalSatisfied && RISK_RANK[request.riskLevel] >= RISK_RANK.high, summary: "Primary Host review for high-risk requests" },
  ];
  if (request.operation === "file_write") {
    evidence.push(
      { kind: "target_path_classification", present: request.pathKind !== "unknown", summary: `Target path classification: ${request.pathKind}` },
      { kind: "rollback_plan", present: Boolean(request.rollbackPlanSummary), summary: "File restoration plan" },
    );
    if (request.overwriteRequested) {
      evidence.push({ kind: "backup_plan", present: request.backupRequired, summary: "Backup required before overwrite" });
    }
  } else {
    evidence.push(
      { kind: "package_source_classification", present: request.packageKind !== "unknown" && request.sourceKind !== "unknown", summary: `${request.packageKind} from ${request.sourceKind}` },
      { kind: "rollback_plan", present: Boolean(request.rollbackPlanSummary), summary: "Install rollback plan" },
      { kind: "uninstall_plan", present: Boolean(request.uninstallPlanSummary), summary: "Uninstall plan" },
    );
  }
  return evidence;
}

export function createAdapterFileInstallApprovalRequirements(
  request: LucaLinkAdapterFileInstallPermissionRequest,
  options: LucaLinkAdapterFileInstallEvaluationOptions = {},
): LucaLinkAdapterFileInstallApprovalRequirement[] {
  const requirements: LucaLinkAdapterFileInstallApprovalRequirement[] = [];
  const add = (kind: LucaLinkAdapterFileInstallApprovalRequirement["kind"], satisfied: boolean, reason: string) =>
    requirements.push({ kind, satisfied, reason, grantsExecution: false });
  add(request.operation === "file_write" ? "file_write_approval" : "install_approval", request.approvalSatisfied, "Capability-specific review is required and cannot grant execution.");
  if (request.requiresApproval || request.operation === "install" || request.operation === "file_write" && request.pathKind === "user_documents") add("user_approval", request.approvalSatisfied && options.explicitUserApproval === true, "Explicit user review metadata is required.");
  if (request.privacyLevel === "private" || request.privacyLevel === "sensitive") add("privacy_approval", options.privacyApproval === true, "Private data requires privacy review.");
  if (RISK_RANK[request.riskLevel] >= RISK_RANK.high) add("primary_host_approval", options.primaryHostApproval === true, "High-risk requests require Primary Host review.");
  const rollbackMissing = request.operation === "file_write" ? !request.rollbackPlanSummary : !request.rollbackPlanSummary || !request.uninstallPlanSummary;
  if (rollbackMissing || request.operation === "file_write" && request.overwriteRequested) add("rollback_approval", false, "Rollback and recovery expectations require review.");
  if (RISK_RANK[request.riskLevel] >= RISK_RANK.medium) {
    add("security_review", options.securityReview === true, "Medium-or-higher risk requires security review.");
    add("provenance_review", Boolean(request.provenance && request.hash && request.signature), "Provenance, digest, and signature metadata require review.");
  }
  return requirements;
}

export function evaluateLucaLinkAdapterFileInstallPermission(
  request: LucaLinkAdapterFileInstallPermissionRequest,
  options: LucaLinkAdapterFileInstallEvaluationOptions = {},
): LucaLinkAdapterFileInstallPermissionDecision {
  if (request.operation === "file_write") return evaluateLucaLinkAdapterFileWritePolicy(request, options);
  if (request.operation === "install") return evaluateLucaLinkAdapterInstallPolicy(request, options);
  const unsupported = request as LucaLinkAdapterFileInstallPermissionRequest;
  return {
    decisionId: `file-install-decision-${unsupported.requestId}`,
    requestId: unsupported.requestId,
    operation: unsupported.operation,
    status: "unsupported",
    riskLevel: unsupported.riskLevel,
    requiredApprovals: [],
    requiredEvidence: [],
    requiredRollback: false,
    allowedForExecution: false,
    writeEnabled: false,
    installEnabled: false,
    sendable: false,
    reason: "Unsupported adapter permission operation.",
    warnings: [...unsupported.warnings],
    blockers: ["The requested operation is unsupported."],
    sideEffectsPerformed: false,
  };
}

export const createLucaLinkAdapterFileInstallDecision = evaluateLucaLinkAdapterFileInstallPermission;

export function summarizeAdapterFileInstallDecision(decision: LucaLinkAdapterFileInstallPermissionDecision): string {
  return `${decision.operation} ${decision.status}: ${decision.reason} Execution, writes, installs, and sending remain disabled.`;
}

export function isAdapterFileInstallDecisionExecutable(_decision: LucaLinkAdapterFileInstallPermissionDecision): false { return false; }
export function isAdapterFileInstallDecisionSendable(_decision: LucaLinkAdapterFileInstallPermissionDecision): false { return false; }
