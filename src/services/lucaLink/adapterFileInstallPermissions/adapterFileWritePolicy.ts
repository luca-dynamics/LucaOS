import type { LucaLinkAdapterFileInstallEvaluationOptions, LucaLinkAdapterFileInstallPermissionDecision, LucaLinkAdapterFileWritePermissionRequest } from "./adapterFileInstallTypes";
import { createAdapterFileInstallApprovalRequirements, createAdapterFileInstallRequiredEvidence } from "./adapterFileInstallDecision";

const SENSITIVE_CONTENT = /(hidden[\s_-]*prompt|private[\s_-]*reasoning|raw[\s_-]*(file|memory)|credential|secret|access[\s_-]*token|api[\s_-]*key|private[\s_-]*key)/i;
const SYSTEM_PATH = /^(?:\/(?:etc|bin|sbin|usr\/bin|usr\/sbin|System)(?:\/|$)|[a-z]:\\(?:Windows|Program Files)(?:\\|$)|~\/\.[^/]+)/i;
const RISK_RANK = { low: 0, medium: 1, high: 2, critical: 3 } as const;

function build(request: LucaLinkAdapterFileWritePermissionRequest, status: LucaLinkAdapterFileInstallPermissionDecision["status"], reason: string, warnings: string[], blockers: string[], options: LucaLinkAdapterFileInstallEvaluationOptions): LucaLinkAdapterFileInstallPermissionDecision {
  return { decisionId: `file-install-decision-${request.requestId}`, requestId: request.requestId, operation: "file_write", status, riskLevel: request.riskLevel, requiredApprovals: createAdapterFileInstallApprovalRequirements(request, options), requiredEvidence: createAdapterFileInstallRequiredEvidence(request), requiredRollback: request.overwriteRequested || RISK_RANK[request.riskLevel] >= RISK_RANK.medium, allowedForExecution: false, writeEnabled: false, installEnabled: false, sendable: false, reason, warnings, blockers, sideEffectsPerformed: false };
}

export function evaluateLucaLinkAdapterFileWritePolicy(request: LucaLinkAdapterFileWritePermissionRequest, options: LucaLinkAdapterFileInstallEvaluationOptions = {}): LucaLinkAdapterFileInstallPermissionDecision {
  const warnings = [...request.warnings];
  const blockers = [...request.blockers];
  const now = options.now instanceof Date ? options.now.getTime() : new Date(options.now ?? Date.now()).getTime();
  if (request.sideEffectsPerformed !== false) blockers.push("Permission preview requires sideEffectsPerformed=false.");
  if (new Date(request.expiresAt).getTime() <= now) return build(request, "expired", "The file-write permission request has expired.", warnings, blockers, options);
  if (request.privacyLevel === "sensitive" || SENSITIVE_CONTENT.test(`${request.targetPath} ${request.contentSummary}`)) blockers.push("Sensitive, secret, credential, raw-file, hidden-prompt, or private-reasoning content is blocked.");
  if (SYSTEM_PATH.test(request.targetPath) || request.pathKind === "system_path" || request.pathKind === "executable_path") blockers.push("System, executable, and home dotfile paths are blocked.");
  if (["binary", "script", "executable"].includes(request.fileType)) blockers.push("Binary, script, and executable writes are blocked.");
  if (request.pathKind === "unknown" || request.fileType === "unknown") blockers.push("Unknown path or file classifications are unsupported.");
  if (request.overwriteRequested && (!request.backupRequired || !request.rollbackPlanSummary)) blockers.push("Overwrite requests require both backup metadata and a rollback plan.");
  if (request.pathKind === "user_documents" && (!request.backupRequired || !request.approvalSatisfied || options.explicitUserApproval !== true)) blockers.push("User document writes require explicit user approval metadata and backup.");
  if (RISK_RANK[request.riskLevel] >= RISK_RANK.medium) {
    if (!request.rollbackPlanSummary) blockers.push("Medium-or-higher risk writes require a rollback plan.");
    if (!request.provenance || !request.hash || !request.signature) blockers.push("Medium-or-higher risk writes require provenance, hash, and signature metadata.");
  }
  if (blockers.length) return build(request, request.pathKind === "unknown" ? "unsupported" : "blocked", "File-write policy blockers prevent review readiness.", warnings, blockers, options);
  const needsApproval = request.requiresApproval || request.riskLevel !== "low" || request.pathKind !== "temp_sandbox";
  return build(request, needsApproval ? "approval_required" : "ready_for_review", needsApproval ? "The request is eligible for review but requires approval metadata; writing remains disabled." : "The request is ready for policy review only; writing remains disabled.", warnings, [], options);
}
