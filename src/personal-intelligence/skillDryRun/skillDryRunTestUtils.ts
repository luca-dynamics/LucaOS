import { createSkillPermissionGrantState, type PersonalIntelligenceSkillPermissionGate } from "../skillPermissions";
import { createPersonalIntelligenceSkillSandboxPlan } from "../skillSandbox";
import { createSkillRegistry, personalIntelligenceSkillRegistryFixtures } from "../skills";

export const testRegistry = createSkillRegistry(personalIntelligenceSkillRegistryFixtures);
export const fixedNow = () => new Date("2026-06-08T12:00:00.000Z");

export function dryRunInput(index = 0, status?: PersonalIntelligenceSkillPermissionGate["status"]) {
  const skillRegistryEntry = testRegistry[index];
  const sandboxPlan = createPersonalIntelligenceSkillSandboxPlan(skillRegistryEntry, { now: fixedNow });
  const permissionGates = createSkillPermissionGrantState([sandboxPlan]).gates.map((gate) => status ? { ...gate, status } : gate);
  return { skillRegistryEntry, sandboxPlan, permissionGates, now: fixedNow };
}
