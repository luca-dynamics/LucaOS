import type { GovernedActionRequest, GovernedActionRequestKind } from "../../types/governedActionRequest";
import type {
  GovernedExecutionCapability,
  GovernedExecutionPolicyDecision,
  GovernedExecutionRiskLevel,
} from "../../types/governedToolExecution";

const SECRET_KEY_PATTERNS = [
  /token/i,
  /secret/i,
  /apiKey/i,
  /api_key/i,
  /privateKey/i,
  /private_key/i,
  /password/i,
  /seed/i,
  /mnemonic/i,
  /credential/i,
];

const BLOCKED_TARGET_PATTERNS = [
  /wallet/i,
  /trade/i,
  /transfer/i,
  /delete/i,
  /write/i,
  /\bfile\b/i,
  /shell/i,
  /network/i,
  /browser/i,
  /device/i,
  /control/i,
  /\bmcp\b/i,
  /execute/i,
  /mutation/i,
  /destroy/i,
  /remove/i,
  /kill/i,
  /sudo/i,
  /admin/i,
];

const SAFE_CAPABILITIES: GovernedExecutionCapability[] = [
  "notify",
  "open_panel",
  "runtime_read",
  "memory_read",
  "inbox_read",
  "session_read",
  "dry_run_confirm",
];

const ALLOWED_SAFE_TARGETS = new Set([
  "inbox",
  "notification",
  "panel:control",
  "panel:activity",
  "panel:memory",
  "panel:logs",
  "panel:model-manager",
  "runtime:diagnostics",
  "runtime:status",
  "memory:summary",
  "memory:readiness",
  "memory:governance",
  "inbox:summary",
  "inbox:unread",
  "session:summary",
  "session:list",
  "dry-run:confirm",
  "display",
  "ui:notify",
]);

const RISKY_KINDS: GovernedActionRequestKind[] = [
  "shell",
  "filesystem",
  "network",
  "memory_write",
];

const CAPABILITY_MAP: Record<string, GovernedExecutionCapability> = {
  notify: "notify",
  notification: "notify",
  display: "notify",
  open_panel: "open_panel",
  panel: "open_panel",
  runtime_read: "runtime_read",
  diagnostics: "runtime_read",
  runtime_diagnostics: "runtime_read",
  memory_read: "memory_read",
  memory_summary: "memory_read",
  memory_readiness: "memory_read",
  memory_governance: "memory_read",
  inbox_read: "inbox_read",
  inbox_summary: "inbox_read",
  inbox_unread: "inbox_read",
  session_read: "session_read",
  session_summary: "session_read",
  session_list: "session_read",
  dry_run_confirm: "dry_run_confirm",
  dry_run: "dry_run_confirm",
};

function mapRiskLevel(riskLevel: string): GovernedExecutionRiskLevel {
  if (riskLevel === "low") return "low";
  if (riskLevel === "medium") return "elevated";
  if (riskLevel === "high") return "high";
  if (riskLevel === "critical") return "critical";
  return "safe";
}

export function sanitizePreview(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).slice(0, 30).map(([key, value]) => {
      if (SECRET_KEY_PATTERNS.some((pattern) => pattern.test(key))) return [key, "[redacted]"];
      if (typeof value === "string") {
        if (SECRET_KEY_PATTERNS.some((pattern) => pattern.test(value))) return [key, "[redacted]"];
        return [key, value.slice(0, 500)];
      }
      if (typeof value === "number" || typeof value === "boolean" || value === null) return [key, value];
      return [key, "[object]"];
    }),
  );
}

export function mapCapability(request: GovernedActionRequest): GovernedExecutionCapability | null {
  const cap = request.requestedCapability?.toLowerCase().replace(/-/g, "_");
  if (cap && cap in CAPABILITY_MAP) return CAPABILITY_MAP[cap];
  const target = request.target?.toLowerCase().replace(/-/g, "_");
  if (target?.startsWith("panel:")) return "open_panel";
  if (target?.startsWith("runtime:")) return "runtime_read";
  if (target?.startsWith("memory:")) return "memory_read";
  if (target?.startsWith("inbox:")) return "inbox_read";
  if (target?.startsWith("session:")) return "session_read";
  if (target === "notification" || target === "display" || target === "ui:notify") return "notify";
  if (target === "dry-run:confirm") return "dry_run_confirm";
  return null;
}

export function isAllowedTarget(target: string): boolean {
  const normalized = target.toLowerCase().trim();
  if (ALLOWED_SAFE_TARGETS.has(normalized)) return true;
  if (BLOCKED_TARGET_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  if (normalized.startsWith("panel:")) return ALLOWED_SAFE_TARGETS.has(normalized);
  return false;
}

function hasSecretKeys(params: Record<string, unknown>): boolean {
  return Object.keys(params).some((key) =>
    SECRET_KEY_PATTERNS.some((pattern) => pattern.test(key)),
  );
}

export function evaluate(request: GovernedActionRequest): GovernedExecutionPolicyDecision {
  const blockedBy: string[] = [];
  const capability = mapCapability(request);
  const riskLevel = mapRiskLevel(request.riskLevel);

  if (!capability) {
    blockedBy.push("unmapped_capability");
  } else if (!SAFE_CAPABILITIES.includes(capability)) {
    blockedBy.push("unsafe_capability");
  }

  if (RISKY_KINDS.includes(request.kind)) {
    const isSafeLocalAction = capability !== null && SAFE_CAPABILITIES.includes(capability) && (riskLevel === "safe" || riskLevel === "low");
    if (!isSafeLocalAction) {
      blockedBy.push("risky_kind");
    }
  }

  if (riskLevel === "elevated" || riskLevel === "high" || riskLevel === "critical") {
    blockedBy.push("elevated_risk");
  }

  if (!request.provenanceIds || request.provenanceIds.length === 0) {
    blockedBy.push("missing_provenance");
  }

  if (!isAllowedTarget(request.target)) {
    blockedBy.push("disallowed_target");
  }

  if (hasSecretKeys(request.parametersPreview)) {
    blockedBy.push("secret_in_parameters");
  }

  if (request.status === "rejected" || request.status === "blocked" || request.status === "expired" || request.status === "executed_elsewhere") {
    blockedBy.push("request_terminal_state");
  }

  const needsApproval = request.status === "approval_required" || request.status === "proposed";
  const isApprovedWaiting = request.status === "approved_waiting_execution";
  if (needsApproval && !isApprovedWaiting) {
    blockedBy.push("approval_not_granted");
  }

  const allowed = blockedBy.length === 0;
  const userSafeReason = allowed
    ? "This action is safe and approved for governed execution."
    : buildBlockedReason(blockedBy);

  return {
    allowed,
    capability: capability ?? null,
    riskLevel,
    blockedBy,
    userSafeReason,
  };
}

function buildBlockedReason(blockedBy: string[]): string {
  if (blockedBy.includes("unmapped_capability")) return "This action does not map to any safe governed execution capability.";
  if (blockedBy.includes("unsafe_capability")) return "This action requires a capability that is not in the safe allowlist.";
  if (blockedBy.includes("risky_kind")) return "This action kind (shell/filesystem/network/memory_write) is blocked by governance policy.";
  if (blockedBy.includes("elevated_risk")) return "This action's risk level is too high for the governed execution bridge.";
  if (blockedBy.includes("missing_provenance")) return "This action has no provenance chain and cannot be verified.";
  if (blockedBy.includes("disallowed_target")) return "This action targets a resource that is not in the governed allowlist.";
  if (blockedBy.includes("secret_in_parameters")) return "This action's parameters contain secret-like keys and cannot be executed through the safe bridge.";
  if (blockedBy.includes("request_terminal_state")) return "This action request is in a terminal state (rejected/blocked/expired/executed).";
  if (blockedBy.includes("approval_not_granted")) return "This action requires approval before it can be executed.";
  return "This action is blocked by governance policy.";
}
