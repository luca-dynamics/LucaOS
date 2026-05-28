import type { LucaTier } from "./EvolutionProposal";
import type { LucaCandidateVariant, LucaConstraintGateResult, LucaEvolutionRun } from "./EvolutionRun";

export type EvolutionRunAction = "create" | "start" | "submit_candidate" | "select_candidate" | "create_proposal" | "archive";

export interface EvolutionRunGateInput {
  run: LucaEvolutionRun;
  requestedAction: EvolutionRunAction;
  actorTier: LucaTier;
  governanceGateResult?: { allowed: boolean; reason?: string };
  constraintResults?: LucaConstraintGateResult[];
  candidate?: LucaCandidateVariant;
  metadata?: Record<string, unknown>;
}

export function evaluateEvolutionRunGate(input: EvolutionRunGateInput) {
  const blockedBy: string[] = [];
  const constraints = input.constraintResults ?? input.run.constraintResults ?? [];
  const hasFailedConstraint = constraints.some((item) => !item.passed);
  const hasRegression = constraints.some((item) => item.kind === "regression" && !item.passed);
  const localExecutionAllowed = input.run.optimizerEngine?.localExecutionAllowed ?? false;

  if (input.actorTier === "normal" && ["create", "start"].includes(input.requestedAction)) blockedBy.push("normal_tier_cannot_create_or_start");

  if (input.actorTier === "tactical") {
    if (input.requestedAction === "start" && localExecutionAllowed) blockedBy.push("tactical_cannot_start_local_execution");
    if (input.requestedAction === "select_candidate") blockedBy.push("tactical_cannot_select_candidate");
  }

  if (input.requestedAction === "start" && localExecutionAllowed) blockedBy.push("local_optimizer_execution_disabled_in_core");

  if (input.requestedAction === "select_candidate") {
    if (hasFailedConstraint) blockedBy.push("failed_constraint_gate");
    if (hasRegression) blockedBy.push("regression_detected");
    if (input.candidate?.status === "promoted") blockedBy.push("autonomous_promotion_disabled");
  }

  const isExternalLab = input.run.source === "external_lab" || input.run.optimizerEngine?.kind === "external_lab";
  if (input.requestedAction === "create_proposal" && isExternalLab && input.actorTier !== "origin") blockedBy.push("external_lab_requires_origin_review");

  if (input.requestedAction === "create_proposal" && input.governanceGateResult && !input.governanceGateResult.allowed) {
    blockedBy.push("governance_gate_blocked");
  }

  return {
    allowed: blockedBy.length === 0,
    reason: blockedBy.length ? "Evolution run gate blocked requested action." : "Allowed",
    blockedBy: blockedBy.length ? blockedBy : undefined,
    metadata: {
      localExecutionAllowed: false,
      networkAllowed: false,
      autonomousPromotionEnabled: false,
      ...(input.metadata ?? {}),
    },
  };
}

export function getEvolutionRunGateSnapshot(input?: Record<string, unknown>) {
  return {
    contractKind: "luca_evolution_run_gate",
    localExecutionAllowed: false,
    networkAllowed: false,
    autonomousPromotionEnabled: false,
    originGoverned: true,
    ...input,
  };
}
