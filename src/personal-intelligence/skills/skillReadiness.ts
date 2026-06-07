import type {
  PersonalIntelligenceSkillReadiness,
  PersonalIntelligenceSkillRegistryEntry,
  PersonalIntelligenceSkillRegistryReadinessSummary,
} from "./skillRegistryTypes";

export function summarizeSkillReadiness(
  entry: PersonalIntelligenceSkillRegistryEntry,
): PersonalIntelligenceSkillReadiness {
  return {
    ...entry.readiness,
    warnings: [...entry.readiness.warnings],
    blockers: [...entry.readiness.blockers],
    readyForExecution: false,
    sideEffectsPerformed: false,
  };
}

export function summarizeSkillRegistryReadiness(
  entries: readonly PersonalIntelligenceSkillRegistryEntry[],
): PersonalIntelligenceSkillRegistryReadinessSummary {
  return {
    total: entries.length,
    readyForInspection: entries.filter((entry) => entry.readiness.readyForInspection).length,
    blockedFromInspection: entries.filter((entry) => !entry.readiness.readyForInspection).length,
    readyForExecution: 0,
    requiresApproval: entries.filter((entry) => entry.readiness.requiresApproval).length,
    requiresSandbox: entries.filter((entry) => entry.readiness.requiresSandbox).length,
    executionEnabled: false,
    sideEffectsPerformed: false,
  };
}
