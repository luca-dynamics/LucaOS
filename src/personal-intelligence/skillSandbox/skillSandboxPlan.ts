import type { PersonalIntelligenceSkillRegistryEntry } from "../skills/skillRegistryTypes";
import { createSkillSandboxApprovalRequirements } from "./skillSandboxApproval";
import { classifySkillSandboxPermissionRequirements } from "./skillSandboxPermissions";
import { evaluatePersonalIntelligenceSkillSandboxPolicy } from "./skillSandboxPolicy";
import type { CreatePersonalIntelligenceSkillSandboxPlanOptions, PersonalIntelligenceSkillSandboxPlan, PersonalIntelligenceSkillSandboxRollbackExpectation, PersonalIntelligenceSkillSandboxTraceRequirement } from "./skillSandboxTypes";

function createTraceRequirements(): PersonalIntelligenceSkillSandboxTraceRequirement[] {
  const expectations: Array<[PersonalIntelligenceSkillSandboxTraceRequirement["stage"], string]> = [
    ["sense", "Record that the skill manifest was selected."],
    ["understand", "Record registry-entry and permission inspection evidence."],
    ["plan", "Record preparation of the side-effect-free sandbox plan."],
    ["approve", "Record that required approvals remain unsatisfied."],
    ["act", "Record a skipped or blocked Act stage; execution is forbidden."],
    ["verify", "Record that readiness still requires review."],
    ["learn", "Prepare a learning candidate only; do not persist it."],
  ];
  return expectations.map(([stage, expectation]) => ({ stage, required: true, expectation, sideEffectsPerformed: false }));
}

function createRollbackExpectation(required: boolean): PersonalIntelligenceSkillSandboxRollbackExpectation {
  return {
    required,
    reason: required
      ? "A reviewed rollback or compensation plan is required before any future stateful runtime pilot."
      : "No execution occurs; rollback remains a future precondition if runtime authority is proposed.",
    expectedRecoverySteps: required
      ? ["Keep execution disabled.", "Identify every proposed mutation before authorization.", "Define restoration or compensation evidence for each mutation.", "Require verification before closing a future run."]
      : ["Keep execution disabled and preserve the inspected registry entry."],
    stateMutationAllowed: false,
    filesTouched: [],
    networkCallsAllowed: false,
    sideEffectsPerformed: false,
  };
}

export function createPersonalIntelligenceSkillSandboxPlan(entry: PersonalIntelligenceSkillRegistryEntry, options: CreatePersonalIntelligenceSkillSandboxPlanOptions = {}): PersonalIntelligenceSkillSandboxPlan {
  const policy = evaluatePersonalIntelligenceSkillSandboxPolicy(entry);
  const requiredPermissions = classifySkillSandboxPermissionRequirements(entry);
  const createdAt = (options.now ?? (() => new Date()))().toISOString();
  const requiredRollbackPlan = createRollbackExpectation(policy.requiresRollbackPlan);
  const partial = {
    planId: options.planId ?? `skill-sandbox:${entry.skillId}`,
    skillId: entry.skillId,
    manifestId: entry.manifestId,
    createdAt,
    source: options.source ?? "personal-intelligence-skill-registry",
    status: policy.status,
    riskLevel: policy.riskLevel,
    executionEnabled: false as const,
    canExecute: false as const,
    sandboxMode: options.sandboxMode ?? (policy.requiresSandbox ? "future_isolated_runtime" : "inspection_only"),
    requiredPermissions,
    requiredApprovals: [],
    requiredRuntimeTraces: createTraceRequirements(),
    requiredRollbackPlan,
    allowedSurfaces: [...policy.allowedSurfaces],
    blockedSurfaces: [...policy.blockedSurfaces],
    permissionSummary: requiredPermissions.length ? `${requiredPermissions.length} permission requirement(s); ${requiredPermissions.filter((item) => item.blocked).length} blocked.` : "No runtime permission requirement declared.",
    approvalSummary: "",
    traceSummary: "Seven evidence-only doctrine stages are required; Act remains skipped or blocked.",
    rollbackSummary: requiredRollbackPlan.reason,
    warnings: [...policy.warnings],
    blockers: [...policy.blockers],
    sideEffectsPerformed: false as const,
  } satisfies PersonalIntelligenceSkillSandboxPlan;
  const requiredApprovals = createSkillSandboxApprovalRequirements(entry);
  return {
    ...partial,
    requiredApprovals,
    approvalSummary: requiredApprovals.length ? `${requiredApprovals.length} approval requirement(s), all unsatisfied.` : "No approval gate identified for inspection-only review.",
  };
}
