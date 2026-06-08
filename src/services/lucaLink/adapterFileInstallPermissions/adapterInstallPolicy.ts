import type { LucaLinkAdapterFileInstallEvaluationOptions, LucaLinkAdapterFileInstallPermissionDecision, LucaLinkAdapterInstallPermissionRequest } from "./adapterFileInstallTypes";
import { createAdapterFileInstallApprovalRequirements, createAdapterFileInstallRequiredEvidence } from "./adapterFileInstallDecision";

const SENSITIVE_CONTENT = /(hidden[\s_-]*prompt|private[\s_-]*reasoning|raw[\s_-]*(file|memory)|credential|secret|access[\s_-]*token|api[\s_-]*key|private[\s_-]*key)/i;
const RISK_RANK = { low: 0, medium: 1, high: 2, critical: 3 } as const;

function build(request: LucaLinkAdapterInstallPermissionRequest, status: LucaLinkAdapterFileInstallPermissionDecision["status"], reason: string, warnings: string[], blockers: string[], options: LucaLinkAdapterFileInstallEvaluationOptions): LucaLinkAdapterFileInstallPermissionDecision {
  return { decisionId: `file-install-decision-${request.requestId}`, requestId: request.requestId, operation: "install", status, riskLevel: request.riskLevel, requiredApprovals: createAdapterFileInstallApprovalRequirements(request, options), requiredEvidence: createAdapterFileInstallRequiredEvidence(request), requiredRollback: true, allowedForExecution: false, writeEnabled: false, installEnabled: false, sendable: false, reason, warnings, blockers, sideEffectsPerformed: false };
}

export function evaluateLucaLinkAdapterInstallPolicy(request: LucaLinkAdapterInstallPermissionRequest, options: LucaLinkAdapterFileInstallEvaluationOptions = {}): LucaLinkAdapterFileInstallPermissionDecision {
  const warnings = [...request.warnings];
  const blockers = [...request.blockers];
  const now = options.now instanceof Date ? options.now.getTime() : new Date(options.now ?? Date.now()).getTime();
  if (request.sideEffectsPerformed !== false) blockers.push("Permission preview requires sideEffectsPerformed=false.");
  if (new Date(request.expiresAt).getTime() <= now) return build(request, "expired", "The install permission request has expired.", warnings, blockers, options);
  if (request.privacyLevel === "sensitive" || SENSITIVE_CONTENT.test(`${request.packageName} ${request.sourceSummary}`)) blockers.push("Sensitive, secret, credential, raw-file, hidden-prompt, or private-reasoning content is blocked.");
  if (request.requiresShell) blockers.push("Install requests requiring a command shell are blocked.");
  if (request.requiresAdmin) blockers.push("Install requests requiring administrator privileges are blocked.");
  if (request.installScope === "system_wide") blockers.push("System-wide install scope is blocked.");
  if (["executable_binary", "script_bundle"].includes(request.packageKind)) blockers.push("Executable binary and script bundle packages are blocked.");
  if (request.sourceKind === "unknown" || request.packageKind === "unknown" || request.installScope === "unknown") blockers.push("Unknown package, source, or scope classification is blocked.");
  if (RISK_RANK[request.riskLevel] >= RISK_RANK.medium || request.packageKind === "runtime_dependency") {
    if (!request.provenance || !request.hash || !request.signature) blockers.push("Medium-or-higher risk installs require provenance, hash, and signature metadata.");
    if (!request.rollbackPlanSummary || !request.uninstallPlanSummary) blockers.push("Medium-or-higher risk installs require rollback and uninstall plans.");
  }
  if (blockers.length) return build(request, "blocked", "Install policy blockers prevent review readiness.", warnings, blockers, options);
  if (request.sourceKind === "remote_url") return build(request, "unsupported", "Remote package sources cannot be downloaded or verified in this policy-only milestone.", warnings, ["Remote sources are unsupported."], options);
  return build(request, "approval_required", request.packageKind === "runtime_dependency" ? "Runtime dependencies require elevated review; installation remains disabled." : "Package metadata is eligible for approval review only; installation remains disabled.", warnings, [], options);
}
