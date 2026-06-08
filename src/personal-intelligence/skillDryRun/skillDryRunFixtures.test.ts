import { describe, expect, it } from "vitest";
import { personalIntelligenceSkillDryRunFixtures } from "./skillDryRunFixtures";

describe("skill dry-run fixtures", () => {
  it("cover reviewable, approval-required, and blocked evidence without side effects", () => {
    const statuses = personalIntelligenceSkillDryRunFixtures.map((fixture) => fixture.status);
    expect(statuses).toContain("ready_for_review");
    expect(statuses).toContain("approval_required");
    expect(statuses).toContain("blocked");
    expect(personalIntelligenceSkillDryRunFixtures.every((fixture) => !fixture.sideEffectsPerformed && !fixture.canExecute)).toBe(true);
  });
});
