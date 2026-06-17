import { createPersonalIntelligenceSkillDryRunSteps } from "./skillDryRunPlan";
import { evaluatePersonalIntelligenceSkillDryRunPolicy } from "./skillDryRunPolicy";
import { createRuntimeTraceFromSkillDryRunSimulation } from "./skillDryRunTraceBridge";
import type { CreatePersonalIntelligenceSkillDryRunInput, PersonalIntelligenceSkillDryRunMissionAlignmentSummary, PersonalIntelligenceSkillDryRunSimulation } from "./skillDryRunTypes";

const REQUIRED_BLOCKED_ACTIONS = ["skill execution", "tool invocation", "model call", "memory write", "LucaLink handoff"];

export function createPersonalIntelligenceSkillDryRunSimulation(
  input: CreatePersonalIntelligenceSkillDryRunInput,
): PersonalIntelligenceSkillDryRunSimulation {
  const createdAt = (input.now ?? (() => new Date()))().toISOString();
  const policy = evaluatePersonalIntelligenceSkillDryRunPolicy(input);
  const gates = input.permissionGates.filter((gate) => gate.planId === input.sandboxPlan.planId);
  const requiredApprovals = gates.filter((gate) => gate.required).map((gate) => gate.label);
  const missingApprovals = gates.filter((gate) => gate.required && gate.status !== "granted_for_review").map((gate) => gate.label);
  const missionAlignmentSummary: PersonalIntelligenceSkillDryRunMissionAlignmentSummary = input.missionEvaluation ? {
    status: input.missionEvaluation.alignmentStatus,
    missionId: input.missionEvaluation.missionId,
    summary: `${input.missionEvaluation.proposalTitle}: ${input.missionEvaluation.alignmentStatus.replace(/_/g, " ")}`,
    violatedConstraints: [...input.missionEvaluation.violatedConstraints],
    requiresUserReview: input.missionEvaluation.requiresUserReview,
    sideEffectsPerformed: false,
  } : {
    status: "not_provided",
    summary: "No mission alignment context was provided; no mission action is inferred.",
    violatedConstraints: [],
    requiresUserReview: false,
    sideEffectsPerformed: false,
  };

  const partial: Omit<PersonalIntelligenceSkillDryRunSimulation, "runtimeTracePreview"> = {
    simulationId: `skill-dry-run:${input.sandboxPlan.planId}`,
    skillId: input.skillRegistryEntry.skillId,
    manifestId: input.skillRegistryEntry.manifestId,
    planId: input.sandboxPlan.planId,
    createdAt,
    source: input.source ?? "selected_skill",
    status: policy.status,
    riskLevel: policy.riskLevel,
    dryRunOnly: true,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
    sideEffectsPerformed: false,
    simulatedSteps: createPersonalIntelligenceSkillDryRunSteps(input.sandboxPlan, gates, policy.status),
    requiredApprovals,
    missingApprovals,
    grantedForReview: gates.filter((gate) => gate.status === "granted_for_review").map((gate) => gate.label),
    deniedGates: gates.filter((gate) => gate.status === "denied").map((gate) => gate.label),
    expiredGates: gates.filter((gate) => gate.status === "expired").map((gate) => gate.label),
    blockedActions: [...new Set([...REQUIRED_BLOCKED_ACTIONS, ...input.sandboxPlan.blockedSurfaces])],
    allowedReviewSurfaces: [...input.sandboxPlan.allowedSurfaces],
    rollbackExpectations: [...input.sandboxPlan.requiredRollbackPlan.expectedRecoverySteps],
    missionAlignmentSummary,
    warnings: policy.warnings,
    blockers: policy.blockers,
  };
  return {
    ...partial,
    runtimeTracePreview: createRuntimeTraceFromSkillDryRunSimulation(partial, {
      ...input.runtimeTraceContext,
      now: () => new Date(createdAt),
    }),
  };
}
