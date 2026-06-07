import type { PersonalIntelligenceSkillSandboxPlan, PersonalIntelligenceSkillSandboxReadiness } from "./skillSandboxTypes";

export function summarizeSkillSandboxReadiness(plans: readonly PersonalIntelligenceSkillSandboxPlan[]): PersonalIntelligenceSkillSandboxReadiness {
  return {
    totalPlans: plans.length,
    readyForReview: plans.filter((plan) => plan.status === "ready_for_review").length,
    approvalRequired: plans.filter((plan) => plan.status === "approval_required").length,
    blocked: plans.filter((plan) => plan.status === "blocked").length,
    disabled: plans.filter((plan) => plan.status === "disabled").length,
    readyForExecution: false,
    executionEnabled: false,
    blockedPermissionKinds: [...new Set(plans.flatMap((plan) => plan.requiredPermissions.filter((permission) => permission.blocked).map((permission) => permission.kind)))],
    approvalRequirementCount: plans.reduce((total, plan) => total + plan.requiredApprovals.filter((approval) => approval.required).length, 0),
    warnings: [...new Set(plans.flatMap((plan) => plan.warnings))],
    blockers: [...new Set(plans.flatMap((plan) => plan.blockers))],
    sideEffectsPerformed: false,
  };
}
