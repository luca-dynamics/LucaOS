import { describe, expect, it } from "vitest";
import { createSkillRegistry, createSkillRegistryEntry } from "../skills/skillRegistry";
import { personalIntelligenceSkillRegistryFixtures } from "../skills/skillRegistryFixtures";
import { createPersonalIntelligenceSkillSandboxPlan } from "./skillSandboxPlan";

const entries = createSkillRegistry(personalIntelligenceSkillRegistryFixtures);
const plan = (entry = entries[0]) => createPersonalIntelligenceSkillSandboxPlan(entry, { now: () => new Date("2026-01-01T00:00:00.000Z") });

describe("skill sandbox plan builder", () => {
  it("builds a deterministic low-risk review plan with execution disabled", () => {
    expect(plan()).toMatchObject({ status: "ready_for_review", executionEnabled: false, canExecute: false, sideEffectsPerformed: false, sandboxMode: "inspection_only" });
  });

  it("requires approval and rollback planning for medium risk", () => {
    expect(plan(entries[2])).toMatchObject({ status: "approval_required", requiredRollbackPlan: { required: true, stateMutationAllowed: false, networkCallsAllowed: false, sideEffectsPerformed: false } });
  });

  it("requires a future isolated sandbox for high risk and blocks critical risk", () => {
    const high = createSkillRegistryEntry({ ...personalIntelligenceSkillRegistryFixtures[0], id: "browser-review", capabilities: ["browser.preview"] });
    expect(plan(high)).toMatchObject({ status: "approval_required", sandboxMode: "future_isolated_runtime" });
    expect(plan(entries[4])).toMatchObject({ status: "blocked", executionEnabled: false, canExecute: false });
  });

  it("honors disabled registry status", () => {
    const disabled = createSkillRegistry([personalIntelligenceSkillRegistryFixtures[0]], { disabledSkillIds: ["writing-format-assistant"] })[0];
    expect(plan(disabled).status).toBe("disabled");
  });
});
