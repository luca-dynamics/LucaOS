import { describe, expect, it } from "vitest";
import { createMissionAdvisoryRecommendation, createMissionNextStepSuggestions, summarizeMissionAdvisoryContext } from "./missionAdvisoryPlanner";
import { alignedMissionEvaluationFixture, safeMissionContextSnapshotFixture } from "./missionRuntimeFixtures";

describe("mission advisory planner", () => {
  it("always produces review-required, non-executable recommendations", () => {
    const recommendation = createMissionAdvisoryRecommendation(alignedMissionEvaluationFixture);
    expect(recommendation.canExecute).toBe(false);
    expect(recommendation.requiresApprovalBeforeAction).toBe(true);
    expect(recommendation.sideEffectsPerformed).toBe(false);
  });

  it("returns text-only planning suggestions and an authority-safe summary", () => {
    const suggestions = createMissionNextStepSuggestions(safeMissionContextSnapshotFixture, alignedMissionEvaluationFixture);
    expect(suggestions.join(" ")).toMatch(/proposal|approval|evidence/i);
    expect(summarizeMissionAdvisoryContext(safeMissionContextSnapshotFixture, alignedMissionEvaluationFixture)).toContain("autonomous execution: disabled");
  });
});
