import { describe, expect, it } from "vitest";
import { createSkillRegistry, createSkillRegistryEntry } from "../skills/skillRegistry";
import { personalIntelligenceSkillRegistryFixtures } from "../skills/skillRegistryFixtures";
import { evaluatePersonalIntelligenceSkillSandboxPolicy } from "./skillSandboxPolicy";

const entries = createSkillRegistry(personalIntelligenceSkillRegistryFixtures);

describe("skill sandbox policy", () => {
  it("allows low-risk inspection to become ready for review but never executable", () => {
    expect(evaluatePersonalIntelligenceSkillSandboxPolicy(entries[0])).toMatchObject({ status: "ready_for_review", executionEnabled: false, canExecute: false, sideEffectsPerformed: false });
  });

  it("requires approval for medium risk and sandbox controls for high risk", () => {
    expect(evaluatePersonalIntelligenceSkillSandboxPolicy(entries[2])).toMatchObject({ status: "approval_required", requiresApproval: true, requiresRuntimeTrace: true });
    const high = createSkillRegistryEntry({ ...personalIntelligenceSkillRegistryFixtures[0], id: "network-review", capabilities: ["network.request"] });
    expect(evaluatePersonalIntelligenceSkillSandboxPolicy(high)).toMatchObject({ status: "approval_required", requiresSandbox: true, requiresRuntimeTrace: true, requiresRollbackPlan: true });
  });

  it("blocks critical and invariant-violating entries", () => {
    expect(evaluatePersonalIntelligenceSkillSandboxPolicy(entries[4]).status).toBe("blocked");
    expect(evaluatePersonalIntelligenceSkillSandboxPolicy({ ...entries[0], executionEnabled: true } as never).status).toBe("blocked");
    expect(evaluatePersonalIntelligenceSkillSandboxPolicy({ ...entries[0], sideEffectsPerformed: true } as never).status).toBe("blocked");
  });
});
