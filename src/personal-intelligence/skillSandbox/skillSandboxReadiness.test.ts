import { describe, expect, it } from "vitest";
import { personalIntelligenceSkillSandboxPlanFixtures } from "./skillSandboxFixtures";
import { summarizeSkillSandboxReadiness } from "./skillSandboxReadiness";

describe("skill sandbox readiness", () => {
  it("summarizes review, approval, and blocked plans without execution readiness", () => {
    const result = summarizeSkillSandboxReadiness(personalIntelligenceSkillSandboxPlanFixtures);
    expect(result).toMatchObject({ totalPlans: 6, readyForReview: 2, approvalRequired: 2, blocked: 2, readyForExecution: false, executionEnabled: false, sideEffectsPerformed: false });
    expect(result.blockedPermissionKinds).toEqual(expect.arrayContaining(["shell", "install", "credential", "device"]));
  });
});
