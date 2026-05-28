import type { LucaEvolutionEvalSummary, LucaEvolutionProposal, LucaTier } from "./EvolutionProposal";

export type EvolutionAction = "submit" | "review" | "approve" | "reject" | "promote" | "rollback" | "archive";

export interface EvolutionGateInput {
  proposal: LucaEvolutionProposal;
  requestedAction: EvolutionAction;
  actorTier: LucaTier;
  skillLifecycleGateResult?: { allowed: boolean; reason?: string };
  evalSummary?: LucaEvolutionEvalSummary;
  safetyContext?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface EvolutionGateOutput {
  allowed: boolean;
  reason?: string;
  requiredApprovals?: LucaTier[];
  blockedBy?: string[];
  nextStatus?: LucaEvolutionProposal["status"];
  metadata: Record<string, unknown>;
}

const RISKY_CAPS = new Set(["computer-use", "filesystem", "network", "voice_policy", "runtime_policy"]);

export function evaluateEvolutionProposalGate(input: EvolutionGateInput): EvolutionGateOutput {
  const { proposal, requestedAction, actorTier } = input;
  const blockedBy: string[] = [];
  const evalSummary = input.evalSummary ?? proposal.evalSummary;
  const risk = proposal.riskAssessment?.riskLevel ?? "unknown";
  const caps = proposal.riskAssessment?.affectedCapabilities ?? [];
  const needsOriginByCapability = caps.some((cap) => RISKY_CAPS.has(cap));

  if (proposal.approvalPolicy?.allowsRuntimeAutoApply ?? false) blockedBy.push("runtime_auto_apply_forbidden");
  if (proposal.metadata.autonomousSelfModificationEnabled) blockedBy.push("autonomous_self_modification_disabled");

  if (actorTier === "normal" && ["submit", "approve", "promote", "rollback"].includes(requestedAction)) blockedBy.push("normal_tier_restricted_action");

  if (proposal.kind === "external_lab_candidate" && actorTier !== "origin") blockedBy.push("external_lab_requires_origin");

  if (actorTier === "tactical" && ["approve", "promote"].includes(requestedAction) && (risk === "high" || risk === "critical" || needsOriginByCapability)) blockedBy.push("tactical_cannot_approve_or_promote_high_risk");

  if (requestedAction === "promote") {
    if (evalSummary?.regressionDetected) blockedBy.push("regression_detected");
    if (proposal.approvalPolicy?.requiresPassingEvals && evalSummary?.evalPassed === false) blockedBy.push("eval_failed");
    if (["medium", "high", "critical"].includes(risk) && proposal.approvalPolicy?.requiresRollbackPlan && !proposal.rollbackPlan?.rollbackAvailable) blockedBy.push("missing_rollback_plan");
  }

  if (["approve", "promote"].includes(requestedAction) && (proposal.approvalPolicy?.requiresOriginApproval || needsOriginByCapability) && actorTier !== "origin") {
    blockedBy.push("requires_origin_approval");
  }

  const nextStatusMap: Record<EvolutionAction, LucaEvolutionProposal["status"]> = {
    submit: "submitted",
    review: "under_review",
    approve: "approved",
    reject: "rejected",
    promote: "promoted",
    rollback: "rolled_back",
    archive: "archived",
  };

  return {
    allowed: blockedBy.length === 0,
    reason: blockedBy.length ? "Governance gate blocked requested action." : "Allowed",
    blockedBy: blockedBy.length ? blockedBy : undefined,
    requiredApprovals: proposal.approvalPolicy?.requiresOriginApproval || needsOriginByCapability ? ["origin"] : undefined,
    nextStatus: blockedBy.length ? undefined : nextStatusMap[requestedAction],
    metadata: {
      autonomousSelfModificationEnabled: false,
      allowsRuntimeAutoApply: false,
      runtimeBehaviorChanged: false,
      ...(input.metadata ?? {}),
    },
  };
}

export function getEvolutionGovernanceGateSnapshot(input?: Record<string, unknown>) {
  return {
    contractKind: "luca_evolution_governance_gate",
    autonomousSelfModificationEnabled: false,
    allowsRuntimeAutoApply: false,
    runtimeBehaviorChanged: false,
    ...input,
  };
}
