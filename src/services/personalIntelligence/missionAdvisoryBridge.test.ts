import { describe, expect, it } from "vitest";
import type { MissionSnapshot } from "../agent/MissionControlService";
import {
  buildLiveMissionAdvisoryBundle,
  buildMissionProgressProposalFromLive,
  summarizeGoalStats,
} from "./missionAdvisoryBridge";

const fixedNow = () => new Date("2026-07-04T12:00:00.000Z");

function live(overrides: Partial<MissionSnapshot> = {}): MissionSnapshot {
  return {
    mission: {
      id: 42,
      title: "Ship the release",
      status: "ACTIVE",
      created_at: 1_700_000_000_000,
      updated_at: 1_700_000_100_000,
      metadata: {
        constraints: ["Do not ship without explicit user approval"],
        successCriteria: [
          "Complete: Draft the notes",
          "Complete: Tag the build",
        ],
      },
    },
    goals: [
      {
        id: 1,
        mission_id: 42,
        description: "Draft the notes",
        status: "COMPLETED",
      },
      {
        id: 2,
        mission_id: 42,
        description: "Tag the build",
        status: "IN_PROGRESS",
      },
      {
        id: 3,
        mission_id: 42,
        description: "Announce the release",
        status: "PENDING",
      },
    ],
    ...overrides,
  };
}

describe("buildMissionProgressProposalFromLive", () => {
  it("summarizes live goal statuses without execution-heavy language", () => {
    const progress = buildMissionProgressProposalFromLive(live());
    expect(progress.proposalTitle).toContain("Ship the release");
    expect(progress.proposalSummary).toContain("Completed goals");
    expect(progress.proposalSummary).toContain("Draft the notes");
    expect(progress.proposalSummary).toContain("Tag the build");
    expect(progress.evidenceRefs).toEqual([
      "evidence:mission-goal:1:completed",
    ]);
    // Progress actions stay review/plan language — never shell/tool execution.
    expect(progress.proposedActions.join(" ")).toMatch(/review|plan|ask/i);
    expect(progress.proposedActions.join(" ")).not.toMatch(
      /\b(install|execute|run shell|write files)\b/i,
    );
  });
});

describe("summarizeGoalStats", () => {
  it("counts each goal status", () => {
    expect(summarizeGoalStats(live().goals)).toEqual({
      total: 3,
      completed: 1,
      inProgress: 1,
      pending: 1,
      failed: 0,
    });
  });
});

describe("buildLiveMissionAdvisoryBundle", () => {
  it("produces a real alignment evaluation from the live mission", () => {
    const bundle = buildLiveMissionAdvisoryBundle(live(), fixedNow);
    expect(bundle.snapshot.title).toBe("Ship the release");
    expect(bundle.snapshot.source).toBe("live-mission-control");
    expect(bundle.snapshot.constraints).toContain(
      "Do not ship without explicit user approval",
    );
    expect(bundle.evaluation.sideEffectsPerformed).toBe(false);
    expect(bundle.evaluation.requiresUserReview).toBe(true);
    // Progress text includes goal descriptions → at least partial goal match.
    expect(bundle.evaluation.matchedGoals.length).toBeGreaterThan(0);
    expect(bundle.recommendation.canExecute).toBe(false);
    expect(bundle.recommendation.requiresApprovalBeforeAction).toBe(true);
    expect(bundle.guidance.mode).toBe("collaborative");
    expect(bundle.guidance.sideEffectsPerformed).toBe(false);
    expect(bundle.goalStats.completed).toBe(1);
  });

  it("never grants execution authority", () => {
    const bundle = buildLiveMissionAdvisoryBundle(live(), fixedNow);
    expect(bundle.recommendation.canExecute).toBe(false);
    expect(bundle.evaluation.sideEffectsPerformed).toBe(false);
    expect(bundle.guidance.blockedAutonomousActions.length).toBeGreaterThan(0);
  });

  it("still evaluates when only pending goals exist", () => {
    const bundle = buildLiveMissionAdvisoryBundle(
      live({
        goals: [
          {
            id: 9,
            mission_id: 42,
            description: "Define milestones",
            status: "PENDING",
          },
        ],
      }),
      fixedNow,
    );
    expect(bundle.progress.evidenceRefs).toEqual([]);
    expect(bundle.evaluation.alignmentStatus).toBeTruthy();
    expect(bundle.recommendation.nextSteps.length).toBeGreaterThan(0);
  });
});
