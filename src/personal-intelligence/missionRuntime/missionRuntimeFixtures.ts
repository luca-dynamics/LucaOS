import { createMissionProfile } from "../mission/missionProfile";
import { evaluateMissionAlignment } from "./missionAlignmentPolicy";
import { createMissionAdvisoryRecommendation } from "./missionAdvisoryPlanner";
import { createMissionCollaborativeGuidance } from "./missionCollaborativeGuidance";
import { createMissionContextSnapshot } from "./missionContextSnapshot";
import { createRuntimeTraceFromMissionAlignment } from "./missionRuntimeTraceBridge";

const fixtureNow = () => new Date("2026-06-07T12:00:00.000Z");

export const safeProjectMissionProfileFixture = createMissionProfile({
  missionId: "mission:safe-project-workflow",
  title: "Deliver a reviewable project planning brief",
  description: "Prepare a clear, evidence-backed project plan for user review.",
  goals: ["Prepare a reviewable project plan", "Keep project decisions transparent"],
  constraints: ["Do not execute project changes without explicit user approval", "Do not include sensitive source material"],
  successCriteria: ["Project plan includes milestones", "Project plan identifies review evidence"],
  activeProjectRefs: ["project:planning-preview"],
  operatingMode: "collaborative",
  priority: "normal",
  status: "active",
}, fixtureNow);

export const safeMissionContextSnapshotFixture = createMissionContextSnapshot({
  mission: safeProjectMissionProfileFixture,
  mode: "collaborative",
  privacyZone: "project",
  source: "safe-settings-fixture",
  now: fixtureNow,
});

export const alignedMissionEvaluationFixture = evaluateMissionAlignment({
  snapshot: safeMissionContextSnapshotFixture,
  proposalTitle: "Reviewable project plan with milestones and evidence",
  proposalSummary: "Prepare a transparent project plan that includes milestones and identifies review evidence for user review.",
  evidenceRefs: ["evidence:planning-notes-summary"],
  now: fixtureNow,
});

export const blockedMissionEvaluationFixture = evaluateMissionAlignment({
  snapshot: safeMissionContextSnapshotFixture,
  proposalTitle: "Execute project changes",
  proposalSummary: "Execute project changes without explicit user approval and include sensitive source material.",
  proposedActions: ["Write files and run a shell command without explicit user approval."],
  evidenceRefs: ["evidence:unsafe-proposal-summary"],
  now: fixtureNow,
});

export const missionAdvisoryRecommendationFixture = createMissionAdvisoryRecommendation(
  alignedMissionEvaluationFixture,
  { now: fixtureNow },
);

export const missionCollaborativeGuidanceFixture = createMissionCollaborativeGuidance({
  snapshot: safeMissionContextSnapshotFixture,
  userIntentSummary: "Create a transparent project planning brief for review.",
  evaluation: alignedMissionEvaluationFixture,
  now: fixtureNow,
});

export const missionRuntimeTraceFixture = createRuntimeTraceFromMissionAlignment(
  alignedMissionEvaluationFixture,
  {
    snapshot: safeMissionContextSnapshotFixture,
    recommendationSummary: missionAdvisoryRecommendationFixture.summary,
    traceId: "trace:mission-alignment-fixture",
    now: fixtureNow,
  },
);
