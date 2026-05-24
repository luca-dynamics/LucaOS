import type { Mission, MissionStep } from "../missionEngine/types";
import {
  GuardActionType,
  GuardApprovalRequirement,
  GuardAuditEvent,
  GuardDecision,
  GuardExecutionContext,
  GuardMode,
  GuardPolicyContext,
  GuardPolicyRule,
  GuardRiskLevel,
  GuardTrustTier,
  MissionGuardHook,
} from "./types";

const nowIso = () => new Date().toISOString();

const defaultRules: GuardPolicyRule[] = [
  {
    id: "deny-dangerous-without-approval",
    description: "Dangerous actions are denied by default unless explicitly approved",
    evaluate: (ctx) => {
      if (ctx.riskLevel === "dangerous" && !ctx.hasExplicitApproval) {
        return { allowed: false, requiresApproval: true, reasons: ["dangerous action requires explicit approval"] };
      }
      return null;
    },
  },
  {
    id: "core-mode-block-evolution-mutation",
    description: "Core mode cannot approve evolution mutation",
    evaluate: (ctx) => {
      if (ctx.mode === "Core" && ctx.actionType === "evolution_mutation") {
        return { allowed: false, requiresApproval: true, reasons: ["Core mode cannot run evolution mutation"] };
      }
      return null;
    },
  },
  {
    id: "sandbox-preference-untrusted-or-high-risk",
    description: "Untrusted or high-risk actions should prefer sandbox execution",
    evaluate: (ctx) => {
      if (ctx.trustTier === "untrusted" || ctx.riskLevel !== "safe") {
        return { preferredExecutionContext: "sandbox", reasons: ["sandbox preferred for untrusted/high-risk actions"] };
      }
      return null;
    },
  },
];

export class LucaGuard implements MissionGuardHook {
  constructor(private readonly rules: GuardPolicyRule[] = defaultRules) {}

  classifyAction(toolOrRuntime: string): GuardActionType {
    const v = toolOrRuntime.toLowerCase();
    if (v.includes("browser")) return "browser";
    if (v.includes("computer") || v.includes("ui") || v.includes("cursor")) return "computer_use";
    if (v.includes("file")) return "filesystem";
    if (v.includes("network") || v.includes("http")) return "network";
    if (v.includes("memory")) return "memory_write";
    if (v.includes("evolution") || v.includes("mutation")) return "evolution_mutation";
    if (v.includes("skill") || v.includes("plugin")) return "skill_execute";
    if (v.includes("command") || v.includes("shell")) return "system_command";
    return "other";
  }

  evaluatePolicy(context: GuardPolicyContext): GuardDecision {
    let decision: GuardDecision = {
      allowed: true,
      requiresApproval: false,
      riskLevel: context.riskLevel,
      trustTier: context.trustTier,
      preferredExecutionContext: context.executionContext,
      reasons: [],
    };

    for (const rule of this.rules) {
      const result = rule.evaluate(context);
      if (!result) continue;
      decision = {
        ...decision,
        ...result,
        reasons: [...decision.reasons, ...(result.reasons ?? [])],
      };
    }

    return decision;
  }

  requiresApproval(context: GuardPolicyContext): GuardApprovalRequirement {
    const decision = this.evaluatePolicy(context);
    return {
      required: decision.requiresApproval,
      reason: decision.reasons[0] ?? "no approval needed",
    };
  }

  createAuditEvent(
    context: GuardPolicyContext,
    decision: GuardDecision,
    missionId?: string,
    stepId?: string,
  ): GuardAuditEvent {
    return {
      eventId: `guard_${Date.now()}`,
      timestamp: nowIso(),
      actionType: context.actionType,
      decision: {
        allowed: decision.allowed,
        requiresApproval: decision.requiresApproval,
        riskLevel: decision.riskLevel,
        trustTier: decision.trustTier,
      },
      executionContext: decision.preferredExecutionContext,
      mode: context.mode,
      missionId,
      stepId,
      reasons: decision.reasons,
    };
  }

  async evaluateMissionStep(mission: Mission, step: MissionStep): Promise<GuardDecision> {
    const context: GuardPolicyContext = {
      actionType: this.classifyAction(step.toolOrRuntime),
      riskLevel: step.riskLevel as GuardRiskLevel,
      trustTier: "verified",
      executionContext: this.classifyAction(step.toolOrRuntime) === "browser" ? "browser" : "direct_host",
      mode: "Tactical",
      hasExplicitApproval: false,
      metadata: { missionId: mission.missionId, stepId: step.stepId },
    };

    return this.evaluatePolicy(context);
  }

  async evaluateStepRisk(mission: Mission, step: MissionStep): Promise<{ allowed: boolean; requiresApproval: boolean; reason?: string }> {
    const decision = await this.evaluateMissionStep(mission, step);
    return {
      allowed: decision.allowed,
      requiresApproval: decision.requiresApproval,
      reason: decision.reasons.join("; ") || undefined,
    };
  }
}
