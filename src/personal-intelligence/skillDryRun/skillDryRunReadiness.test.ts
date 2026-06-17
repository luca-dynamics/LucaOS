import { describe, expect, it } from "vitest";
import { personalIntelligenceSkillDryRunFixtures } from "./skillDryRunFixtures";
import { summarizeSkillDryRunReadiness } from "./skillDryRunReadiness";

describe("skill dry-run readiness", () => {
  it("summarizes review evidence while preserving disabled execution", () => {
    expect(summarizeSkillDryRunReadiness(personalIntelligenceSkillDryRunFixtures)).toMatchObject({ totalSimulations: personalIntelligenceSkillDryRunFixtures.length, readyForExecution: false, executionEnabled: false, canExecute: false, dryRunOnly: true, sideEffectsPerformed: false });
  });
});
