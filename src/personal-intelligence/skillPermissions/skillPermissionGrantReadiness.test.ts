import { describe, expect, it } from "vitest";
import { personalIntelligenceSkillPermissionGrantFixtures } from "./skillPermissionGrantFixtures";
import { evaluateSkillPermissionGrantReadiness } from "./skillPermissionGrantReadiness";

describe("skill permission readiness", () => {
  it("summarizes every review state while permanently blocking execution", () => {
    const readiness = evaluateSkillPermissionGrantReadiness(personalIntelligenceSkillPermissionGrantFixtures.gates);
    expect(readiness.grantedForReview).toBeGreaterThan(0);
    expect(readiness.denied).toBeGreaterThan(0);
    expect(readiness.expired).toBeGreaterThan(0);
    expect(readiness.blocked).toBeGreaterThan(0);
    expect(readiness.readyForExecution).toBe(false);
    expect(readiness.executionEnabled).toBe(false);
    expect(readiness.canExecute).toBe(false);
    expect(readiness.sideEffectsPerformed).toBe(false);
  });
});
