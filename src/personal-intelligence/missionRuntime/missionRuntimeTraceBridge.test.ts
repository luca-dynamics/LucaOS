import { describe, expect, it } from "vitest";
import { alignedMissionEvaluationFixture, missionCollaborativeGuidanceFixture, safeMissionContextSnapshotFixture } from "./missionRuntimeFixtures";
import { createLearningEventFromMissionGuidance, createRuntimeTraceFromMissionAlignment } from "./missionRuntimeTraceBridge";

describe("mission runtime trace bridge", () => {
  it("creates doctrine-stage evidence and skips autonomous action", () => {
    const trace = createRuntimeTraceFromMissionAlignment(alignedMissionEvaluationFixture, {
      snapshot: safeMissionContextSnapshotFixture,
      now: () => new Date("2026-06-07T12:00:00.000Z"),
    });
    expect(trace.stages.map((stage) => stage.stage)).toEqual(["sense", "understand", "plan", "approve", "act", "verify", "learn"]);
    expect(trace.stages.find((stage) => stage.stage === "act")?.status).toBe("skipped");
    expect(trace.stages.every((stage) => stage.sideEffectsPerformed === false)).toBe(true);
    expect(trace.sideEffectsPerformed).toBe(false);
  });

  it("creates a proposal-ready learning candidate without persistence", () => {
    const result = createLearningEventFromMissionGuidance(missionCollaborativeGuidanceFixture, {
      snapshot: safeMissionContextSnapshotFixture,
      evaluation: alignedMissionEvaluationFixture,
      now: () => new Date("2026-06-07T12:00:00.000Z"),
    });
    expect(result.event.proposalReady).toBe(true);
    expect(result.event.persisted).toBe(false);
    expect(result.event.writePerformed).toBe(false);
  });
});
