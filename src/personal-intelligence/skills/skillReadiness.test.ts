import { describe, expect, it } from "vitest";
import { createSkillRegistry } from "./skillRegistry";
import { personalIntelligenceSkillRegistryFixtures } from "./skillRegistryFixtures";
import { summarizeSkillReadiness, summarizeSkillRegistryReadiness } from "./skillReadiness";

describe("skill readiness summaries", () => {
  it("separates inspection readiness from execution readiness", () => {
    const [entry] = createSkillRegistry(personalIntelligenceSkillRegistryFixtures);
    expect(summarizeSkillReadiness(entry)).toMatchObject({
      readyForInspection: true,
      readyForExecution: false,
      sideEffectsPerformed: false,
    });
  });

  it("never reports an executable registry", () => {
    const summary = summarizeSkillRegistryReadiness(createSkillRegistry(personalIntelligenceSkillRegistryFixtures));
    expect(summary.readyForInspection).toBe(6);
    expect(summary.readyForExecution).toBe(0);
    expect(summary.executionEnabled).toBe(false);
    expect(summary.sideEffectsPerformed).toBe(false);
  });
});
