import { describe, expect, it } from "vitest";
import { evaluatePersonalIntelligenceSkillDryRunPolicy } from "./skillDryRunPolicy";
import { dryRunInput } from "./skillDryRunTestUtils";

describe("skill dry-run policy", () => {
  it("allows all review grants to become reviewable but never executable", () => {
    const result = evaluatePersonalIntelligenceSkillDryRunPolicy(dryRunInput(0, "granted_for_review"));
    expect(result).toMatchObject({ status: "ready_for_review", readyForExecution: false, executionEnabled: false, canExecute: false, dryRunOnly: true });
  });
  it("requires approval for pending gates", () => {
    const input = dryRunInput(2, "pending");
    expect(evaluatePersonalIntelligenceSkillDryRunPolicy(input).status).toBe("approval_required");
  });
  it("blocks denied high-risk gates, blocked plans, critical risk, and runtime authority", () => {
    const denied = dryRunInput(2, "denied");
    denied.permissionGates = denied.permissionGates.map((gate) => ({ ...gate, riskLevel: "high" }));
    expect(evaluatePersonalIntelligenceSkillDryRunPolicy(denied).status).toBe("blocked");
    const blocked = dryRunInput(4);
    expect(evaluatePersonalIntelligenceSkillDryRunPolicy(blocked).status).toBe("blocked");
    expect(evaluatePersonalIntelligenceSkillDryRunPolicy({ ...blocked, runtimeAuthority: { executionEnabled: true } }).status).toBe("blocked");
  });
});
