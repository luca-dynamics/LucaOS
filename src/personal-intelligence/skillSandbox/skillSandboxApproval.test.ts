import { describe, expect, it } from "vitest";
import { createSkillRegistry, createSkillRegistryEntry } from "../skills/skillRegistry";
import { personalIntelligenceSkillRegistryFixtures } from "../skills/skillRegistryFixtures";
import { createSkillSandboxApprovalRequirements } from "./skillSandboxApproval";

const entries = createSkillRegistry(personalIntelligenceSkillRegistryFixtures);

describe("skill sandbox approval planning", () => {
  it("creates memory and privacy approvals without satisfying them", () => {
    const approvals = createSkillSandboxApprovalRequirements(entries[2]);
    expect(approvals.map((approval) => approval.kind)).toEqual(expect.arrayContaining(["user", "privacy", "memory"]));
    expect(approvals.every((approval) => approval.satisfied === false)).toBe(true);
  });

  it("adds safety and primary-host review for device-related requests", () => {
    const entry = createSkillRegistryEntry({ ...personalIntelligenceSkillRegistryFixtures[0], id: "device-review", permissions: [], capabilities: ["device.control"] });
    expect(createSkillSandboxApprovalRequirements(entry).map((approval) => approval.kind)).toEqual(expect.arrayContaining(["safety", "primary_host"]));
  });
});
