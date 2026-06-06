import type { PersonalIntelligencePersistenceProposal } from "./persistenceTypes";

export type PersistencePlanStatus =
  | "draft"
  | "ready_for_future_adapter"
  | "blocked";
export type PersistencePlanKind = "rollback" | "delete";

interface PersistencePlanBase {
  planId: string;
  kind: PersistencePlanKind;
  proposalId: string;
  targetRef: string;
  reason: string;
  requiredBeforeWrite: boolean;
  steps: string[];
  status: PersistencePlanStatus;
  sideEffectsPerformed: false;
}

export interface PersistenceRollbackPlan extends PersistencePlanBase {
  kind: "rollback";
}

export interface PersistenceDeletePlan extends PersistencePlanBase {
  kind: "delete";
}

export type PersistenceSafetyPlan =
  | PersistenceRollbackPlan
  | PersistenceDeletePlan;

export interface PersistencePlanOptions {
  planId?: string;
  targetRef?: string;
  reason?: string;
  steps?: string[];
  status?: PersistencePlanStatus;
}

export interface PersistencePlanValidationResult {
  valid: boolean;
  errors: string[];
}

export function createRollbackPlanForProposal(
  proposal: PersonalIntelligencePersistenceProposal,
  options: PersistencePlanOptions = {},
): PersistenceRollbackPlan {
  return {
    planId: options.planId ?? `rollback:${proposal.proposalId}`,
    kind: "rollback",
    proposalId: proposal.proposalId,
    targetRef:
      options.targetRef ?? proposal.targetRef ?? proposedTarget(proposal),
    reason:
      options.reason ??
      "Restore the target to its pre-write state if a future adapter fails validation.",
    requiredBeforeWrite: true,
    steps: [
      ...(options.steps ?? [
        "Capture the future adapter's pre-write target state.",
        "Verify the captured state is sufficient to restore the target.",
        "Require explicit user approval before any restore action.",
      ]),
    ],
    status: options.status ?? "draft",
    sideEffectsPerformed: false,
  };
}

export function createDeletePlanForProposal(
  proposal: PersonalIntelligencePersistenceProposal,
  options: PersistencePlanOptions = {},
): PersistenceDeletePlan {
  return {
    planId: options.planId ?? `delete:${proposal.proposalId}`,
    kind: "delete",
    proposalId: proposal.proposalId,
    targetRef:
      options.targetRef ?? proposal.targetRef ?? proposedTarget(proposal),
    reason:
      options.reason ??
      "Define a governed deletion path before a future adapter changes retained data.",
    requiredBeforeWrite: true,
    steps: [
      ...(options.steps ?? [
        "Resolve the exact future persistence target without deleting it.",
        "Require explicit user approval for deletion.",
        "Record future deletion verification and audit evidence.",
      ]),
    ],
    status: options.status ?? "draft",
    sideEffectsPerformed: false,
  };
}

export function validateRollbackPlan(
  plan: PersistenceSafetyPlan,
): PersistencePlanValidationResult {
  const errors: string[] = [];
  if (!plan.planId.trim()) errors.push("planId is required");
  if (!plan.proposalId.trim()) errors.push("proposalId is required");
  if (!plan.targetRef.trim()) errors.push("targetRef is required");
  if (!plan.reason.trim()) errors.push("reason is required");
  if (!plan.requiredBeforeWrite)
    errors.push("requiredBeforeWrite must be true");
  if (plan.steps.length === 0 || plan.steps.some((step) => !step.trim())) {
    errors.push("at least one non-empty plan step is required");
  }
  if (plan.sideEffectsPerformed !== false)
    errors.push("sideEffectsPerformed must remain false");
  return { valid: errors.length === 0, errors };
}

function proposedTarget(
  proposal: PersonalIntelligencePersistenceProposal,
): string {
  return proposal.kind === "memory"
    ? proposal.proposedPath
    : `learning-event:${proposal.learningEvent.eventId}`;
}
