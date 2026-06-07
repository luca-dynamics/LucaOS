import type { MissionAdvisoryRecommendation, MissionAlignmentEvaluation, MissionRuntimeReadinessSummary, PersonalIntelligenceMissionContextSnapshot } from "./missionRuntimeTypes";

export function summarizeMissionRuntimeReadiness(
  snapshots: readonly PersonalIntelligenceMissionContextSnapshot[],
  evaluations: readonly MissionAlignmentEvaluation[],
  recommendations: readonly MissionAdvisoryRecommendation[],
): MissionRuntimeReadinessSummary {
  const blockedSnapshots = snapshots.filter((snapshot) => snapshot.blockers.length > 0).length;
  const blockers: string[] = [];
  const warnings = ["Readiness indicates advisory/collaborative review capability only; it never grants execution authority."];
  if (snapshots.length === 0) blockers.push("At least one safe mission context snapshot is required.");
  if (blockedSnapshots > 0) blockers.push(`${blockedSnapshots} mission snapshot(s) contain blockers.`);
  if (evaluations.length === 0) warnings.push("No mission alignment evaluations are available yet.");
  if (recommendations.length === 0) warnings.push("No advisory recommendations are available for user review yet.");

  const safeSnapshots = snapshots.length > 0 && blockedSnapshots === 0;
  return {
    totalSnapshots: snapshots.length,
    blockedSnapshots,
    alignedEvaluations: evaluations.filter((evaluation) => evaluation.alignmentStatus === "aligned" || evaluation.alignmentStatus === "partially_aligned").length,
    needsReviewEvaluations: evaluations.filter((evaluation) => evaluation.alignmentStatus === "needs_review").length,
    blockedEvaluations: evaluations.filter((evaluation) => evaluation.alignmentStatus === "blocked" || evaluation.alignmentStatus === "misaligned").length,
    recommendationsReadyForUserReview: recommendations.filter((recommendation) => recommendation.requiresApprovalBeforeAction && !recommendation.canExecute).length,
    autonomousExecutionEnabled: false,
    readyForAdvisoryMode: safeSnapshots,
    readyForCollaborativeMode: safeSnapshots && evaluations.length > 0,
    warnings,
    blockers,
  };
}
