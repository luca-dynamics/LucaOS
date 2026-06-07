import type { MissionAdvisoryRecommendation, MissionAlignmentEvaluation, PersonalIntelligenceMissionContextSnapshot } from "./missionRuntimeTypes";

interface MissionAdvisoryOptions {
  title?: string;
  now?: () => Date;
}

export function createMissionNextStepSuggestions(
  snapshot: PersonalIntelligenceMissionContextSnapshot,
  evaluation: MissionAlignmentEvaluation,
): string[] {
  const steps: string[] = [];
  if (evaluation.unverifiedAssumptions.length) steps.push("Ask the user to clarify unverified mission assumptions.");
  if (evaluation.violatedConstraints.length) steps.push("Revise the plan to remove each identified constraint violation.");
  if (evaluation.riskLevel === "high" || evaluation.riskLevel === "critical") steps.push("Split the task into smaller reviewable proposals.");
  if (evaluation.successCriteriaCoverage.unverified.length) steps.push("Collect evidence for uncovered success criteria.");
  if (!evaluation.blockers.length) steps.push("Prepare a bounded proposal for explicit user review.");
  steps.push("Defer every action until the user approves it through the relevant runtime gates.");
  return Array.from(new Set(steps)).slice(0, 6);
}

export function createMissionAdvisoryRecommendation(
  evaluation: MissionAlignmentEvaluation,
  options: MissionAdvisoryOptions = {},
): MissionAdvisoryRecommendation {
  const timestamp = (options.now ?? (() => new Date()))().toISOString();
  const recommendationType = selectRecommendationType(evaluation);
  return {
    recommendationId: `mission-recommendation:${evaluation.missionId}:${timestamp}`,
    missionId: evaluation.missionId,
    title: options.title ?? `Advisory review: ${evaluation.proposalTitle}`,
    summary: `Mission alignment is ${evaluation.alignmentStatus}. This recommendation is planning guidance only and grants no execution authority.`,
    recommendationType,
    nextSteps: recommendationSteps(evaluation, recommendationType),
    rationale: [
      `${evaluation.matchedGoals.length} mission goal(s) matched deterministically.`,
      `${evaluation.violatedConstraints.length} constraint violation(s) identified.`,
      `${Math.round(evaluation.successCriteriaCoverage.coverageRatio * 100)}% success-criteria coverage is visible in the proposal.`,
    ],
    riskLevel: evaluation.riskLevel,
    requiresApprovalBeforeAction: true,
    canExecute: false,
    warnings: [...evaluation.warnings, "Mission alignment is not approval."],
    blockers: [...evaluation.blockers],
    sideEffectsPerformed: false,
  };
}

export function summarizeMissionAdvisoryContext(
  snapshot: PersonalIntelligenceMissionContextSnapshot,
  evaluation: MissionAlignmentEvaluation,
): string {
  return `${snapshot.title} is in ${snapshot.mode} mode. Proposal alignment: ${evaluation.alignmentStatus}; goals matched: ${evaluation.matchedGoals.length}/${snapshot.goals.length}; success criteria covered: ${Math.round(evaluation.successCriteriaCoverage.coverageRatio * 100)}%; user review required: true; autonomous execution: disabled.`;
}

function selectRecommendationType(evaluation: MissionAlignmentEvaluation): MissionAdvisoryRecommendation["recommendationType"] {
  if (evaluation.alignmentStatus === "blocked") return "block";
  if (evaluation.alignmentStatus === "misaligned") return "revise";
  if (evaluation.unverifiedAssumptions.length) return "ask_user";
  if (evaluation.riskLevel === "high" || evaluation.riskLevel === "critical") return "split_task";
  if (evaluation.alignmentStatus === "needs_review") return "defer";
  return "proceed";
}

function recommendationSteps(evaluation: MissionAlignmentEvaluation, type: MissionAdvisoryRecommendation["recommendationType"]): string[] {
  const base = type === "block"
    ? ["Keep the proposal blocked and present blockers to the user."]
    : type === "revise"
      ? ["Revise the proposal before requesting review."]
      : type === "ask_user"
        ? ["Ask the user to clarify mission assumptions and intended boundaries."]
        : type === "split_task"
          ? ["Split the proposal into smaller reviewable tasks."]
          : type === "defer"
            ? ["Collect evidence and defer action until review."]
            : ["Present the aligned plan to the user as a proposal, not an action."];
  if (evaluation.successCriteriaCoverage.unverified.length) base.push("Collect evidence for unverified success criteria.");
  base.push("Require explicit approval before any future action.");
  return base;
}
