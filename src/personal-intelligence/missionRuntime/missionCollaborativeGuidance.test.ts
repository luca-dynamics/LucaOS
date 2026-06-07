import { describe, expect, it } from "vitest";
import { createMissionCollaborativeGuidance } from "./missionCollaborativeGuidance";
import { alignedMissionEvaluationFixture, safeMissionContextSnapshotFixture } from "./missionRuntimeFixtures";

describe("createMissionCollaborativeGuidance", () => {
  it("works with the user while explicitly blocking autonomous action", () => {
    const guidance = createMissionCollaborativeGuidance({
      snapshot: safeMissionContextSnapshotFixture,
      userIntentSummary: "Prepare a project plan for review.",
      evaluation: alignedMissionEvaluationFixture,
    });
    expect(guidance.mode).toBe("collaborative");
    expect(guidance.approvalBoundaries.join(" ")).toMatch(/not approval|explicitly approve/i);
    expect(guidance.blockedAutonomousActions.length).toBeGreaterThan(0);
    expect(guidance.sideEffectsPerformed).toBe(false);
  });
});
