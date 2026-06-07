import { describe, expect, it } from "vitest";
import { personalIntelligenceSkillSandboxPlanFixtures } from "../skillSandbox";
import { createSkillPermissionGates, createSkillPermissionGrantState } from "./skillPermissionGrantState";

const plan = personalIntelligenceSkillSandboxPlanFixtures.find((item) => item.requiredPermissions.length > 0)!;

describe("skill permission gate creation", () => {
  it("converts every permission and approval requirement without enabling execution", () => {
    const gates = createSkillPermissionGates(plan);
    expect(gates).toHaveLength(plan.requiredPermissions.length + plan.requiredApprovals.length);
    expect(gates.every((gate) => gate.scope.mode === "review_only")).toBe(true);
    expect(gates.every((gate) => gate.scope.executionAuthorized === false)).toBe(true);
    expect(gates.every((gate) => !gate.executionEnabled && !gate.canExecute && !gate.sideEffectsPerformed)).toBe(true);
  });

  it("keeps aggregate execution invariants false", () => {
    const state = createSkillPermissionGrantState(personalIntelligenceSkillSandboxPlanFixtures);
    expect(state.readyForExecution).toBe(false);
    expect(state.executionEnabled).toBe(false);
    expect(state.canExecute).toBe(false);
    expect(state.sideEffectsPerformed).toBe(false);
  });
});
