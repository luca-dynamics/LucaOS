import type { PersonalIntelligenceSkillSandboxPlan } from "../skillSandbox";
import { permissionGateInitialStatus } from "./skillPermissionGrantPolicy";
import type { PersonalIntelligenceSkillPermissionGate, PersonalIntelligenceSkillPermissionGrantState } from "./skillPermissionGrantTypes";

export function createSkillPermissionGates(plan: PersonalIntelligenceSkillSandboxPlan): PersonalIntelligenceSkillPermissionGate[] {
  const base = {
    skillId: plan.skillId,
    manifestId: plan.manifestId,
    planId: plan.planId,
    riskLevel: plan.riskLevel,
    required: true,
    executionEnabled: false as const,
    canExecute: false as const,
    sideEffectsPerformed: false as const,
  };

  const permissionGates = plan.requiredPermissions.map((requirement) => ({
    ...base,
    gateId: `permission-gate:${plan.planId}:${requirement.permissionId}`,
    permissionId: requirement.permissionId,
    kind: "permission" as const,
    permissionKind: requirement.kind,
    label: requirement.label,
    reason: requirement.reason,
    status: permissionGateInitialStatus(requirement),
    scope: {
      mode: "review_only" as const,
      skillId: plan.skillId,
      manifestId: plan.manifestId,
      planId: plan.planId,
      permissionKind: requirement.kind,
      executionAuthorized: false as const,
    },
  }));

  const approvalGates = plan.requiredApprovals.map((requirement) => ({
    ...base,
    gateId: `permission-gate:${plan.planId}:${requirement.approvalId}`,
    approvalId: requirement.approvalId,
    kind: "approval" as const,
    approvalKind: requirement.kind,
    label: requirement.label,
    reason: requirement.reason,
    status: permissionGateInitialStatus(requirement),
    scope: {
      mode: "review_only" as const,
      skillId: plan.skillId,
      manifestId: plan.manifestId,
      planId: plan.planId,
      approvalKind: requirement.kind,
      executionAuthorized: false as const,
    },
  }));

  return [...permissionGates, ...approvalGates];
}

export function createSkillPermissionGrantState(plans: readonly PersonalIntelligenceSkillSandboxPlan[]): PersonalIntelligenceSkillPermissionGrantState {
  return {
    gates: plans.flatMap(createSkillPermissionGates),
    auditEvents: [],
    readyForExecution: false,
    executionEnabled: false,
    canExecute: false,
    sideEffectsPerformed: false,
  };
}
