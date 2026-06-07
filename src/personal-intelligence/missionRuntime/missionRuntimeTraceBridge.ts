import { createLearningEventFromRuntimeTrace } from "../runtime/runtimeLearningEvents";
import { appendRuntimeTraceStage, createPersonalIntelligenceRuntimeTrace } from "../runtime/runtimeTraceRecorder";
import type { LearningEventCreationResult, PersonalIntelligenceRuntimeTrace, RuntimeTraceStageInput } from "../runtime/runtimeTraceTypes";
import type { MissionAlignmentEvaluation, MissionCollaborativeGuidance, PersonalIntelligenceMissionContextSnapshot } from "./missionRuntimeTypes";

interface MissionTraceContext {
  snapshot: PersonalIntelligenceMissionContextSnapshot;
  recommendationSummary?: string;
  evidenceVerifiedExternally?: boolean;
  traceId?: string;
  source?: string;
  now?: () => Date;
}

interface MissionGuidanceLearningOptions {
  snapshot: PersonalIntelligenceMissionContextSnapshot;
  evaluation?: MissionAlignmentEvaluation;
  eventId?: string;
  traceId?: string;
  confidence?: number;
  now?: () => Date;
}

export function createRuntimeTraceFromMissionAlignment(
  evaluation: MissionAlignmentEvaluation,
  context: MissionTraceContext,
): PersonalIntelligenceRuntimeTrace {
  const timestamp = (context.now ?? (() => new Date()))().toISOString();
  let trace = createPersonalIntelligenceRuntimeTrace({
    traceId: context.traceId ?? `mission-trace:${evaluation.evaluationId}`,
    title: `Mission alignment evidence: ${evaluation.proposalTitle}`,
    source: context.source ?? "personal-intelligence-mission-runtime",
    privacyZone: context.snapshot.privacyZone,
    relatedMissionId: evaluation.missionId,
    relatedProposalId: evaluation.evaluationId,
    warnings: [...evaluation.warnings],
    blockers: [...evaluation.blockers],
    now: () => new Date(timestamp),
  });
  const stages: RuntimeTraceStageInput[] = [
    { stage: "sense", status: "completed", summary: "Received a bounded mission snapshot and user proposal summary.", timestamp },
    { stage: "understand", status: "completed", summary: `Interpreted mission goals, constraints, and success criteria; alignment is ${evaluation.alignmentStatus}.`, timestamp },
    { stage: "plan", status: "completed", summary: context.recommendationSummary ?? "Prepared advisory planning guidance only; no runtime action was requested.", timestamp },
    { stage: "approve", status: "completed", summary: "Recorded the approval boundary: explicit user approval remains required and mission alignment grants no authority.", requiresApproval: true, approvalSatisfied: false, timestamp },
    { stage: "act", status: "skipped", summary: "No autonomous action was performed; execution remains outside the mission guidance layer.", requiresApproval: true, approvalSatisfied: false, timestamp },
    { stage: "verify", status: "completed", summary: context.evidenceVerifiedExternally ? "Recorded that external evidence was reported as verified; this bridge did not perform verification." : "Recorded that evidence requires user or external review; this bridge performed no verification.", timestamp },
    { stage: "learn", status: "completed", summary: "Prepared a learning candidate only; nothing was persisted.", timestamp },
  ];
  for (const stage of stages) trace = appendRuntimeTraceStage(trace, stage);
  return { ...trace, sideEffectsPerformed: false };
}

export function createLearningEventFromMissionGuidance(
  guidance: MissionCollaborativeGuidance,
  options: MissionGuidanceLearningOptions,
): LearningEventCreationResult {
  const trace = createRuntimeTraceFromMissionAlignment(
    options.evaluation ?? guidanceEvaluation(options.snapshot, guidance),
    {
      snapshot: options.snapshot,
      traceId: options.traceId ?? `mission-guidance-trace:${guidance.guidanceId}`,
      recommendationSummary: `Prepared collaborative guidance with ${guidance.suggestedNextSteps.length} text-only next step(s).`,
      now: options.now,
    },
  );
  return createLearningEventFromRuntimeTrace(trace, {
    eventId: options.eventId ?? `mission-learning:${guidance.guidanceId}`,
    confidence: options.confidence ?? 0.65,
    now: options.now,
  });
}

function guidanceEvaluation(
  snapshot: PersonalIntelligenceMissionContextSnapshot,
  guidance: MissionCollaborativeGuidance,
): MissionAlignmentEvaluation {
  return {
    evaluationId: `guidance-evaluation:${guidance.guidanceId}`,
    missionId: snapshot.missionId,
    proposalTitle: "Collaborative mission guidance",
    proposalSummary: guidance.userIntentSummary,
    alignmentStatus: "needs_review",
    matchedGoals: [],
    violatedConstraints: [],
    unverifiedAssumptions: [...snapshot.operatingAssumptions],
    successCriteriaCoverage: { matched: [], unverified: [...snapshot.successCriteria], coverageRatio: 0 },
    riskLevel: "medium",
    requiresUserReview: true,
    warnings: ["Collaborative guidance requires user review."],
    blockers: [...snapshot.blockers],
    sideEffectsPerformed: false,
  };
}
