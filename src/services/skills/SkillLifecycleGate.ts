import { LucaSkillManifest, LucaUserOperationTier } from "./SkillManifest";

export type LucaSkillRequestedAction = "view" | "invoke" | "promote" | "deprecate" | "rollback" | "evolve" | "ingest";

export interface SkillLifecycleGateInput {
  manifest: LucaSkillManifest;
  requestedTier: LucaUserOperationTier;
  requestedAction: LucaSkillRequestedAction;
  evalResult?: { passed?: boolean; score?: number };
  safetyContext?: { originOverride?: boolean };
  metadata?: Record<string, unknown>;
}

export interface SkillLifecycleGateResult {
  allowed: boolean;
  reason?: string;
  requiredApprovals?: string[];
  blockedBy?: string[];
  lifecycleState: LucaSkillManifest["lifecycleState"];
  metadata?: Record<string, unknown>;
}

export const evaluateSkillLifecycleGate = (input: SkillLifecycleGateInput): SkillLifecycleGateResult => {
  const { manifest, requestedTier, requestedAction, evalResult, safetyContext } = input;
  const blockedBy: string[] = [];
  const requiredApprovals: string[] = [];

  if (["promote", "evolve", "rollback"].includes(requestedAction) && requestedTier === "normal") {
    return { allowed: false, reason: "normal_tier_restricted", blockedBy: ["tier_policy"], lifecycleState: manifest.lifecycleState };
  }

  if (requestedAction === "invoke") {
    if (["deprecated", "rejected", "archived"].includes(manifest.lifecycleState) && !(requestedTier === "origin" && safetyContext?.originOverride)) {
      return { allowed: false, reason: "lifecycle_blocked", blockedBy: [manifest.lifecycleState], lifecycleState: manifest.lifecycleState };
    }
    if (["draft", "candidate"].includes(manifest.lifecycleState) && requestedTier === "normal") {
      return { allowed: false, reason: "pre_active_not_allowed_for_normal", blockedBy: [manifest.lifecycleState], lifecycleState: manifest.lifecycleState };
    }
  }

  if (requestedAction === "promote") {
    if (requestedTier === "tactical" && (manifest.safetyPolicy?.riskLevel === "high" || manifest.safetyPolicy?.riskLevel === "critical")) {
      return { allowed: false, reason: "tactical_cannot_promote_high_risk", blockedBy: ["risk_policy"], lifecycleState: manifest.lifecycleState };
    }
    if (manifest.promotionPolicy?.promotionRequiresOrigin && requestedTier !== "origin") {
      return { allowed: false, reason: "origin_required", blockedBy: ["promotion_policy"], lifecycleState: manifest.lifecycleState };
    }
    if (manifest.promotionPolicy?.promotionRequiresPassingEvals && !evalResult?.passed) {
      blockedBy.push("eval_policy");
    }
    if (manifest.promotionPolicy?.promotionRequiresRollbackPlan && !manifest.rollbackPolicy?.rollbackAvailable) {
      blockedBy.push("rollback_policy");
    }
  }

  if ((requestedAction === "evolve" || requestedAction === "rollback") && requestedTier !== "origin") {
    return { allowed: false, reason: "origin_required", blockedBy: ["tier_policy"], lifecycleState: manifest.lifecycleState };
  }

  if (manifest.safetyPolicy?.riskLevel === "critical" && requestedTier !== "origin") {
    requiredApprovals.push("origin_approval");
    return { allowed: false, reason: "critical_requires_origin", requiredApprovals, blockedBy: ["safety_policy"], lifecycleState: manifest.lifecycleState };
  }

  if (blockedBy.length > 0) {
    return { allowed: false, reason: "policy_not_satisfied", blockedBy, requiredApprovals, lifecycleState: manifest.lifecycleState };
  }

  return { allowed: true, lifecycleState: manifest.lifecycleState, requiredApprovals, metadata: input.metadata };
};

export const getSkillLifecycleGateSnapshot = (input: SkillLifecycleGateInput) => ({
  gateKind: "luca_skill_lifecycle_gate",
  requestedAction: input.requestedAction,
  requestedTier: input.requestedTier,
  allowed: evaluateSkillLifecycleGate(input).allowed,
});
