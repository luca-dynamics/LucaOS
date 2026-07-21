import { describe, expect, it } from "vitest";
import {
  createSkillRegistry,
  createSkillRegistryEntry,
} from "../skills/skillRegistry";
import { personalIntelligenceSkillRegistryFixtures } from "../skills/skillRegistryFixtures";
import { createPersonalIntelligenceSkillSandboxPlan } from "./skillSandboxPlan";

const entries = createSkillRegistry(personalIntelligenceSkillRegistryFixtures);
const byId = (skillId: string) => {
  const entry = entries.find((item) => item.skillId === skillId);
  if (!entry) throw new Error(`Missing fixture skill: ${skillId}`);
  return entry;
};
const plan = (
  entry = byId("luca-fluid-design-review"),
) =>
  createPersonalIntelligenceSkillSandboxPlan(entry, {
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });

describe("skill sandbox plan builder", () => {
  it("builds a deterministic low-risk review plan with execution disabled", () => {
    expect(plan()).toMatchObject({
      status: "ready_for_review",
      executionEnabled: false,
      canExecute: false,
      sideEffectsPerformed: false,
      sandboxMode: "inspection_only",
    });
  });

  it("requires approval and rollback planning for medium risk", () => {
    // memory-proposal-helper is medium risk (memory permission) and needs
    // rollback because memory-kind permissions are stateful.
    expect(plan(byId("memory-proposal-helper"))).toMatchObject({
      status: "approval_required",
      requiredRollbackPlan: {
        required: true,
        stateMutationAllowed: false,
        networkCallsAllowed: false,
        sideEffectsPerformed: false,
      },
    });
  });

  it("requires a future isolated sandbox for high risk and blocks critical risk", () => {
    const high = createSkillRegistryEntry({
      ...personalIntelligenceSkillRegistryFixtures.find(
        (item) => item.id === "luca-fluid-design-review",
      )!,
      id: "browser-review",
      capabilities: ["browser.preview"],
    });
    expect(plan(high)).toMatchObject({
      status: "approval_required",
      sandboxMode: "future_isolated_runtime",
    });

    // shell/install fixtures are critical and blocked from execution planning.
    expect(plan(byId("blocked-system-modifier"))).toMatchObject({
      status: "blocked",
      executionEnabled: false,
      canExecute: false,
    });
  });

  it("honors disabled registry status", () => {
    const disabled = createSkillRegistry(
      personalIntelligenceSkillRegistryFixtures.filter(
        (item) => item.id === "writing-format-assistant",
      ),
      { disabledSkillIds: ["writing-format-assistant"] },
    )[0];
    expect(plan(disabled).status).toBe("disabled");
  });
});
