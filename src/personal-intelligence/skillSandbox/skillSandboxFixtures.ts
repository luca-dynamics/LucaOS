import { createSkillRegistry } from "../skills/skillRegistry";
import { personalIntelligenceSkillRegistryFixtures } from "../skills/skillRegistryFixtures";
import { createPersonalIntelligenceSkillSandboxPlan } from "./skillSandboxPlan";

export const personalIntelligenceSkillSandboxRegistryFixtures = createSkillRegistry(personalIntelligenceSkillRegistryFixtures);

export const personalIntelligenceSkillSandboxPlanFixtures = personalIntelligenceSkillSandboxRegistryFixtures.map((entry, index) =>
  createPersonalIntelligenceSkillSandboxPlan(entry, {
    planId: `fixture-sandbox-plan:${entry.skillId}`,
    now: () => new Date(`2026-01-01T00:00:0${index}.000Z`),
  }),
);
