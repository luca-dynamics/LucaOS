import { createLearningEventFromRuntimeTrace } from "../runtime/runtimeLearningEvents";
import { appendRuntimeTraceStage, createPersonalIntelligenceRuntimeTrace } from "../runtime/runtimeTraceRecorder";
import type { LearningEventCreationResult, PersonalIntelligenceRuntimeTrace, RuntimeTraceStageInput } from "../runtime/runtimeTraceTypes";
import type { PersonalIntelligenceSkillSandboxPlan, SkillSandboxLearningOptions, SkillSandboxTraceContext } from "./skillSandboxTypes";

export function createRuntimeTraceFromSkillSandboxPlan(plan: PersonalIntelligenceSkillSandboxPlan, context: SkillSandboxTraceContext = {}): PersonalIntelligenceRuntimeTrace {
  const timestamp = (context.now ?? (() => new Date()))().toISOString();
  let trace = createPersonalIntelligenceRuntimeTrace({
    traceId: context.traceId ?? `skill-sandbox-trace:${plan.planId}`,
    title: `Skill sandbox evidence: ${plan.skillId}`,
    source: context.source ?? "personal-intelligence-skill-sandbox",
    privacyZone: context.privacyZone ?? "project",
    relatedProposalId: plan.planId,
    warnings: [...plan.warnings],
    blockers: [...plan.blockers],
    now: () => new Date(timestamp),
  });
  const stages: RuntimeTraceStageInput[] = [
    { stage: "sense", status: "completed", summary: "Skill manifest selected for inspection.", timestamp },
    { stage: "understand", status: "completed", summary: "Registry entry and declared permission requirements inspected.", timestamp },
    { stage: "plan", status: "completed", summary: "Side-effect-free sandbox plan prepared.", timestamp },
    { stage: "approve", status: plan.requiredApprovals.length ? "blocked" : "completed", summary: "Approval planning recorded; approval remains unsatisfied and grants no authority.", requiresApproval: plan.requiredApprovals.length > 0, approvalSatisfied: false, timestamp },
    { stage: "act", status: "skipped", summary: "Skill execution skipped; no runtime action was performed.", requiresApproval: true, approvalSatisfied: false, timestamp },
    { stage: "verify", status: "completed", summary: "Sandbox readiness requires human review and remains not ready for execution.", timestamp },
    { stage: "learn", status: "completed", summary: "Learning candidate prepared for proposal review only; nothing was persisted.", timestamp },
  ];
  for (const stage of stages) trace = appendRuntimeTraceStage(trace, stage);
  return { ...trace, sideEffectsPerformed: false };
}

export function createLearningEventFromSkillSandboxPlan(plan: PersonalIntelligenceSkillSandboxPlan, options: SkillSandboxLearningOptions = {}): LearningEventCreationResult {
  const trace = createRuntimeTraceFromSkillSandboxPlan(plan, {
    traceId: options.traceId,
    now: options.now,
  });
  return createLearningEventFromRuntimeTrace(trace, {
    eventId: options.eventId ?? `skill-sandbox-learning:${plan.planId}`,
    confidence: options.confidence ?? 0.6,
    now: options.now,
  });
}
