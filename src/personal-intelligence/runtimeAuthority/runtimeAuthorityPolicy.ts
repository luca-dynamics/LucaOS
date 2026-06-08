import type {
  PersonalIntelligenceRuntimeAuthorityPolicyInput,
  PersonalIntelligenceRuntimeAuthorityPolicyResult,
  PersonalIntelligenceRuntimeAuthoritySource,
  PersonalIntelligenceRuntimeCapabilityKind,
} from "./runtimeAuthorityTypes";

const CAPABILITIES = new Set([
  "skill_execution", "tool_invocation", "mcp_invocation", "workflow_execution", "model_call",
  "memory_proposal", "memory_write", "browser_action", "network_access", "file_read", "file_write",
  "connector_access", "lucalink_handoff", "shell_command", "install_package", "credential_access",
  "payment_or_trading", "device_control", "generated_code_execution", "private_reasoning_access", "unknown",
]);
const SOURCES = new Set([
  "skill_registry", "sandbox_plan", "permission_gates", "dry_run", "memory_proposal",
  "mission_profile", "runtime_trace", "fixture",
]);
const PERMANENT = new Set([
  "shell_command", "install_package", "credential_access", "private_reasoning_access",
  "generated_code_execution", "device_control", "payment_or_trading",
]);
const REVIEW = new Set(["memory_proposal"]);
const DRY_RUN = new Set([
  "skill_execution", "tool_invocation", "mcp_invocation", "workflow_execution", "model_call",
  "memory_write", "browser_action", "network_access", "file_read", "file_write", "connector_access",
  "lucalink_handoff",
]);
const PILOT_EVIDENCE = [
  "successful dry-run evidence", "all required gates granted for review",
  "aligned or reviewed mission evaluation", "rollback expectation", "runtime trace preview",
  "absence of permanently blocked capabilities",
];
const RUNTIME_BOUNDARY = [
  "isolated runtime", "rollback enforcement", "durable audit", "explicit human review",
  "separate pilot implementation",
];
const BLOCKED_ACTIONS = [
  "skill execution", "tool invocation", "model call", "memory write", "LucaLink handoff",
  "runtime authority grant",
];

export function classifyPersonalIntelligenceRuntimeAuthority(
  input: PersonalIntelligenceRuntimeAuthorityPolicyInput,
): PersonalIntelligenceRuntimeAuthorityPolicyResult {
  const kindValid = CAPABILITIES.has(input.capabilityKind as PersonalIntelligenceRuntimeCapabilityKind);
  const sourceValid = SOURCES.has(input.source as PersonalIntelligenceRuntimeAuthoritySource);
  const kind = kindValid ? input.capabilityKind as PersonalIntelligenceRuntimeCapabilityKind : "unknown";
  const prohibitedDeclaration = /raw[ _.-]?file[ _.-]?exfiltration|background[ _.-]?surveillance/i.test(input.capabilityKind);
  const riskLevel = input.riskLevel ?? "medium";
  const attemptedAuthority = Boolean(input.authorityGranted || input.executionEnabled || input.canExecute || input.readyForExecution);
  const incomplete = input.declarationsComplete === false || input.manifestPresent === false || input.sandboxPlanPresent === false;
  const criticalUnknown = riskLevel === "critical" && kind === "unknown";
  const candidateEvidenceComplete = input.dryRunSuccessful === true
    && input.requiredGatesGrantedForReview === true
    && input.hasBlockedDeniedOrExpiredGates === false
    && (input.missionAlignment === "aligned" || input.missionAlignment === "reviewed")
    && input.rollbackExpectationExists === true
    && input.runtimeTracePreviewExists === true
    && input.permanentBlockedCapabilityPresent === false;

  let authorityClass: PersonalIntelligenceRuntimeAuthorityPolicyResult["authorityClass"];
  if (PERMANENT.has(kind) || criticalUnknown || prohibitedDeclaration) authorityClass = "permanently_blocked";
  else if (!kindValid || !sourceValid || incomplete || kind === "unknown") authorityClass = "unsupported";
  else if (riskLevel === "critical") authorityClass = "unsupported";
  else if (DRY_RUN.has(kind) && candidateEvidenceComplete && (riskLevel === "low" || riskLevel === "medium")) authorityClass = "future_pilot_candidate";
  else if (REVIEW.has(kind) || input.source === "mission_profile" || input.source === "runtime_trace" || input.source === "permission_gates") authorityClass = "review_only";
  else authorityClass = DRY_RUN.has(kind) ? "dry_run_only" : "unsupported";

  const blockers = [
    ...(attemptedAuthority ? ["Runtime authority flags cannot be enabled by authority-boundary input."] : []),
    ...(PERMANENT.has(kind) ? [`${kind.replace(/_/g, " ")} is permanently blocked.`] : []),
    ...(criticalUnknown ? ["Unknown critical capabilities are permanently blocked."] : []),
    ...(prohibitedDeclaration ? ["Raw file exfiltration and background surveillance are permanently blocked."] : []),
    ...(!sourceValid ? ["Unsupported authority source."] : []),
    ...(incomplete ? ["Capability declarations, manifest, or sandbox plan are incomplete."] : []),
    ...(riskLevel === "critical" && !criticalUnknown && !PERMANENT.has(kind) ? ["Critical risk cannot become a future pilot candidate."] : []),
  ];
  const warnings = [
    "Runtime authority is not granted.",
    "Dry-run success does not grant execution authority.",
    "Grant-for-review does not grant execution authority.",
    ...(authorityClass === "future_pilot_candidate" ? ["Future pilot candidate does not mean executable."] : []),
  ];
  return {
    authorityClass,
    riskLevel,
    requiredEvidence: [...PILOT_EVIDENCE],
    requiredApprovals: ["explicit user approval", "safety review", "runtime boundary review"],
    requiredRuntimeBoundary: [...RUNTIME_BOUNDARY],
    blockedActions: [...BLOCKED_ACTIONS],
    warnings,
    blockers,
    authorityGranted: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
    sideEffectsPerformed: false,
  };
}
