import { describe, expect, it } from "vitest";
import { createPersonalIntelligenceSkillDryRunSimulation } from "./skillDryRunSimulator";
import { createRuntimeTraceFromSkillDryRunSimulation } from "./skillDryRunTraceBridge";
import { dryRunInput } from "./skillDryRunTestUtils";

describe("skill dry-run trace bridge", () => {
  it("records Act as skipped or blocked and Learn as unpersisted candidate evidence", () => {
    const simulation = createPersonalIntelligenceSkillDryRunSimulation(dryRunInput(0, "granted_for_review"));
    const trace = createRuntimeTraceFromSkillDryRunSimulation(simulation);
    expect(trace.stages.find((stage) => stage.stage === "act")?.status).toMatch(/skipped|blocked/);
    expect(trace.stages.find((stage) => stage.stage === "learn")).toMatchObject({ status: "skipped", sideEffectsPerformed: false });
    expect(trace.sideEffectsPerformed).toBe(false);
  });
});
