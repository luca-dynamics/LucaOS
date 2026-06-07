import { describe, expect, it } from "vitest";
import { alignedMissionEvaluationFixture, missionAdvisoryRecommendationFixture, safeMissionContextSnapshotFixture } from "./missionRuntimeFixtures";
import { summarizeMissionRuntimeReadiness } from "./missionRuntimeReadiness";

describe("summarizeMissionRuntimeReadiness", () => {
  it("reports advisory/collaborative readiness without execution authority", () => {
    const readiness = summarizeMissionRuntimeReadiness(
      [safeMissionContextSnapshotFixture],
      [alignedMissionEvaluationFixture],
      [missionAdvisoryRecommendationFixture],
    );
    expect(readiness.autonomousExecutionEnabled).toBe(false);
    expect(readiness.readyForAdvisoryMode).toBe(true);
    expect(readiness.readyForCollaborativeMode).toBe(true);
    expect(readiness.recommendationsReadyForUserReview).toBe(1);
  });
});
