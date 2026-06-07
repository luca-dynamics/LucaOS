import { describe, expect, it } from "vitest";
import { personalIntelligenceSkillSandboxPlanFixtures } from "./skillSandboxFixtures";
import { createLearningEventFromSkillSandboxPlan, createRuntimeTraceFromSkillSandboxPlan } from "./skillSandboxTraceBridge";

const lowRiskPlan = personalIntelligenceSkillSandboxPlanFixtures[0];

describe("skill sandbox runtime trace bridge", () => {
  it("records evidence-only doctrine stages and skips Act", () => {
    const trace = createRuntimeTraceFromSkillSandboxPlan(lowRiskPlan, { now: () => new Date("2026-01-01T00:00:00.000Z") });
    expect(trace.stages.find((stage) => stage.stage === "act")).toMatchObject({ status: "skipped", sideEffectsPerformed: false });
    expect(trace.sideEffectsPerformed).toBe(false);
  });

  it("creates a proposal-ready learning candidate without persistence", () => {
    const result = createLearningEventFromSkillSandboxPlan(lowRiskPlan, { now: () => new Date("2026-01-01T00:00:00.000Z") });
    expect(result.event).toMatchObject({ proposalReady: true, persisted: false, writePerformed: false });
  });
});
