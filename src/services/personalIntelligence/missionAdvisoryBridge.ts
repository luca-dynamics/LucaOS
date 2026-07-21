import type { MissionGoal, MissionSnapshot } from "../agent/MissionControlService";
import {
  createMissionAdvisoryRecommendation,
  createMissionCollaborativeGuidance,
  evaluateMissionAlignment,
  type MissionAdvisoryRecommendation,
  type MissionAlignmentEvaluation,
  type MissionCollaborativeGuidance,
  type PersonalIntelligenceMissionContextSnapshot,
} from "../../personal-intelligence/missionRuntime";
import { buildMissionContextSnapshotFromLive } from "./missionSnapshotBridge";

/**
 * Live mission advisory bridge — turns the active MissionControl snapshot into
 * a real PI alignment evaluation + advisory recommendation + collaborative
 * guidance. Read/planning only: no mutation of the mission, no tool execution,
 * no memory write.
 *
 * The "proposal" under review is the mission's own progress (completed /
 * in-progress / pending goals). That keeps the evaluation grounded in live
 * state without inventing an external agent proposal.
 */

export interface MissionProgressProposal {
  proposalTitle: string;
  proposalSummary: string;
  proposedActions: string[];
  evidenceRefs: string[];
  userIntentSummary: string;
}

export interface LiveMissionAdvisoryBundle {
  snapshot: PersonalIntelligenceMissionContextSnapshot;
  evaluation: MissionAlignmentEvaluation;
  recommendation: MissionAdvisoryRecommendation;
  guidance: MissionCollaborativeGuidance;
  progress: MissionProgressProposal;
  /** Counts derived from live goals for UI chips. */
  goalStats: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    failed: number;
  };
}

function goalsByStatus(
  goals: readonly MissionGoal[],
  status: MissionGoal["status"],
): MissionGoal[] {
  return goals.filter((goal) => goal.status === status);
}

/**
 * Build a progress-review proposal from live goals. Language is deliberately
 * non-executing ("review", "prepare", "continue reviewing") so the alignment
 * policy does not treat progress reporting as shell/tool execution.
 */
export function buildMissionProgressProposalFromLive(
  live: MissionSnapshot,
): MissionProgressProposal {
  const { mission, goals } = live;
  const completed = goalsByStatus(goals, "COMPLETED");
  const inProgress = goalsByStatus(goals, "IN_PROGRESS");
  const pending = goalsByStatus(goals, "PENDING");
  const failed = goalsByStatus(goals, "FAILED");

  const summaryParts: string[] = [
    `Mission "${mission.title}" progress review for the user.`,
  ];
  if (completed.length) {
    summaryParts.push(
      `Completed goals: ${completed.map((g) => g.description).join("; ")}.`,
    );
  }
  if (inProgress.length) {
    summaryParts.push(
      `In-progress goals: ${inProgress.map((g) => g.description).join("; ")}.`,
    );
  }
  if (pending.length) {
    summaryParts.push(
      `Pending goals: ${pending.map((g) => g.description).join("; ")}.`,
    );
  }
  if (failed.length) {
    summaryParts.push(
      `Failed goals: ${failed.map((g) => g.description).join("; ")}.`,
    );
  }
  if (goals.length === 0) {
    summaryParts.push("No goals are recorded on this mission yet.");
  }

  // Non-executing review actions only — never "run/install/write files".
  const proposedActions: string[] = [];
  for (const goal of inProgress) {
    proposedActions.push(
      `Continue reviewing progress on: ${goal.description}`,
    );
  }
  for (const goal of pending) {
    proposedActions.push(
      `Prepare a reviewable plan for: ${goal.description}`,
    );
  }
  for (const goal of failed) {
    proposedActions.push(
      `Ask the user how to revise: ${goal.description}`,
    );
  }
  if (proposedActions.length === 0 && completed.length > 0) {
    proposedActions.push(
      "Present completed mission progress to the user for review.",
    );
  }
  if (proposedActions.length === 0) {
    proposedActions.push(
      "Ask the user which mission goal should take priority next.",
    );
  }

  return {
    proposalTitle: `Mission progress: ${mission.title}`,
    proposalSummary: summaryParts.join(" "),
    proposedActions,
    // Completed goals count as evidence toward success criteria.
    evidenceRefs: completed.map(
      (goal) => `evidence:mission-goal:${goal.id}:completed`,
    ),
    userIntentSummary: `Review progress on mission "${mission.title}" and decide the next collaborative step with the user.`,
  };
}

export function summarizeGoalStats(goals: readonly MissionGoal[]): LiveMissionAdvisoryBundle["goalStats"] {
  return {
    total: goals.length,
    completed: goalsByStatus(goals, "COMPLETED").length,
    inProgress: goalsByStatus(goals, "IN_PROGRESS").length,
    pending: goalsByStatus(goals, "PENDING").length,
    failed: goalsByStatus(goals, "FAILED").length,
  };
}

/**
 * Full live advisory bundle from a MissionControl snapshot.
 */
export function buildLiveMissionAdvisoryBundle(
  live: MissionSnapshot,
  now: () => Date = () => new Date(),
): LiveMissionAdvisoryBundle {
  const snapshot = buildMissionContextSnapshotFromLive(live, now);
  const progress = buildMissionProgressProposalFromLive(live);
  const evaluation = evaluateMissionAlignment({
    snapshot,
    proposalTitle: progress.proposalTitle,
    proposalSummary: progress.proposalSummary,
    proposedActions: progress.proposedActions,
    evidenceRefs: progress.evidenceRefs,
    now,
  });
  const recommendation = createMissionAdvisoryRecommendation(evaluation, {
    title: `Advisory: ${live.mission.title}`,
    now,
  });
  const guidance = createMissionCollaborativeGuidance({
    snapshot,
    userIntentSummary: progress.userIntentSummary,
    evaluation,
    now,
  });

  return {
    snapshot,
    evaluation,
    recommendation,
    guidance,
    progress,
    goalStats: summarizeGoalStats(live.goals),
  };
}
