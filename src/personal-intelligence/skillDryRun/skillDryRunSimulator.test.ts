import { describe, expect, it } from "vitest";
import { createPersonalIntelligenceSkillDryRunSimulation } from "./skillDryRunSimulator";
import { dryRunInput } from "./skillDryRunTestUtils";

describe("skill dry-run simulator", () => {
  it("builds deterministic review-only steps and blocks Act", () => {
    const simulation = createPersonalIntelligenceSkillDryRunSimulation(dryRunInput(0, "granted_for_review"));
    expect(simulation.simulatedSteps.map((step) => step.label)).toEqual(["Inspect manifest", "Review sandbox plan", "Check permission gates", "Check mission alignment", "Prepare runtime trace", "Prepare rollback expectations", "Skip Act stage", "Verify dry-run result", "Prepare learning candidate"]);
    expect(simulation.simulatedSteps.find((step) => step.stage === "blocked_act")?.status).toMatch(/skipped|blocked/);
    expect(simulation).toMatchObject({ sideEffectsPerformed: false, executionEnabled: false, canExecute: false, readyForExecution: false, dryRunOnly: true });
  });
  it("reports denied and expired gates without enabling execution", () => {
    expect(createPersonalIntelligenceSkillDryRunSimulation(dryRunInput(2, "denied")).deniedGates.length).toBeGreaterThan(0);
    expect(createPersonalIntelligenceSkillDryRunSimulation(dryRunInput(2, "expired")).status).toBe("approval_required");
  });
});
