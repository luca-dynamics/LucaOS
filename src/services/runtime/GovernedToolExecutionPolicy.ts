import type { GovernedActionRequest, GovernedActionRequestKind } from "../../types/governedActionRequest";
import type {
  GovernedExecutionCapability,
  GovernedExecutionPolicyDecision,
  GovernedExecutionRiskLevel,
} from "../../types/governedToolExecution";
import { isSafeLocalPanelTarget } from "./SafeLocalPanelTargets";
import { validateSandboxedBrowserUrl } from "./SandboxedBrowserUrlPolicy";

// PR #134: the ONLY target accepted for the gated browser shell capability.
export const SAFE_URL_BROWSER_TARGET = "browser-shell:safe-url";

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
  "view:runtime-diagnostics",
  "view:memory-proposals",
  "view:skill-requests",
  "view:current-plan",
  "view:routing-decisions",
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
  // PR #134: narrowly-scoped safe URL open. Not added to SAFE_CAPABILITIES —
  // it is evaluated by its own dedicated, stricter branch in evaluate().
  open_approved_safe_url: "open_approved_safe_url",
  open_safe_url: "open_approved_safe_url",
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
  if (target?.startsWith("view:")) return "open_panel";
  if (target?.startsWith("runtime:")) return "runtime_read";
  if (target?.startsWith("memory:")) return "memory_read";
  if (target?.startsWith("inbox:")) return "inbox_read";
  if (target?.startsWith("session:")) return "session_read";
  if (target === "notification" || target === "display" || target === "ui:notify") return "notify";
  if (target === "dry-run:confirm") return "dry_run_confirm";
  if (target === "browser_shell:safe_url") return "open_approved_safe_url";
  return null;
}

function extractSafeUrl(params: Record<string, unknown>): string {
  const value = params?.safeUrl ?? params?.url;
  return typeof value === "string" ? value : "";
}

// PR #134: dedicated, strict evaluation for opening ONE user-approved safe URL
// in the sandbox browser shell. Deliberately separate from the generic safe
// path so it never widens the generic allowlist or the PR #133 research policy.
function evaluateOpenApprovedSafeUrl(
  request: GovernedActionRequest,
  riskLevel: GovernedExecutionRiskLevel,
): GovernedExecutionPolicyDecision {
  const blockedBy: string[] = [];

  const normalizedTarget = request.target?.toLowerCase().trim();
  if (normalizedTarget !== SAFE_URL_BROWSER_TARGET) blockedBy.push("invalid_browser_shell_target");

  if (!request.provenanceIds || request.provenanceIds.length === 0) blockedBy.push("missing_provenance");

  // Only low or elevated risk may open a shell; high/critical are blocked.
  if (riskLevel === "high" || riskLevel === "critical") blockedBy.push("high_risk_browser_url");

  if (hasSecretKeys(request.parametersPreview)) blockedBy.push("secret_in_parameters");

  const urlResult = validateSandboxedBrowserUrl(extractSafeUrl(request.parametersPreview));
  if (!urlResult.allowed) blockedBy.push("unsafe_url");

  if (request.status === "rejected" || request.status === "blocked" || request.status === "expired" || request.status === "executed_elsewhere") {
    blockedBy.push("request_terminal_state");
  }

  const needsApproval = request.status === "approval_required" || request.status === "proposed";
  const isApprovedWaiting = request.status === "approved_waiting_execution";
  if (needsApproval && !isApprovedWaiting) blockedBy.push("approval_not_granted");

  const allowed = blockedBy.length === 0;
  return {
    allowed,
    capability: "open_approved_safe_url",
    riskLevel,
    blockedBy,
    userSafeReason: allowed
      ? "Approved safe URL can be opened in the Luca sandbox browser shell. Luca cannot automate the page, read the DOM, handle credentials, or download/upload."
      : buildBlockedReason(blockedBy),
  };
}

export function isAllowedTarget(target: string): boolean {
  const normalized = target.toLowerCase().trim();
  if (ALLOWED_SAFE_TARGETS.has(normalized)) return true;
  if (isSafeLocalPanelTarget(normalized)) return true;
  if (BLOCKED_TARGET_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  if (normalized.startsWith("panel:")) return ALLOWED_SAFE_TARGETS.has(normalized);
  if (normalized.startsWith("view:")) return ALLOWED_SAFE_TARGETS.has(normalized);
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

  // PR #134: the gated browser shell capability has its own strict branch and
  // must bypass the generic capability/target allowlists (which intentionally
  // block anything matching /browser/).
  if (capability === "open_approved_safe_url") {
    return evaluateOpenApprovedSafeUrl(request, riskLevel);
  }

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
  if (blockedBy.includes("invalid_browser_shell_target")) return "This browser shell action does not target the approved safe-URL shell.";
  if (blockedBy.includes("high_risk_browser_url")) return "This URL's risk level is too high for the sandbox browser shell.";
  if (blockedBy.includes("unsafe_url")) return "This URL failed safe-URL validation and cannot be opened in the sandbox browser shell.";
  return "This action is blocked by governance policy.";
}
