import type { PersonalIntelligenceSkillDryRunReadiness, PersonalIntelligenceSkillDryRunSimulation } from "./skillDryRunTypes";

export function summarizeSkillDryRunReadiness(
  simulations: readonly PersonalIntelligenceSkillDryRunSimulation[],
): PersonalIntelligenceSkillDryRunReadiness {
  const count = (status: PersonalIntelligenceSkillDryRunSimulation["status"]) => simulations.filter((simulation) => simulation.status === status).length;
  return {
    totalSimulations: simulations.length,
    readyForReview: count("ready_for_review"),
    approvalRequired: count("approval_required"),
    blocked: count("blocked"),
    disabled: count("disabled"),
    readyForExecution: false,
    executionEnabled: false,
    canExecute: false,
    dryRunOnly: true,
    sideEffectsPerformed: false,
    warnings: ["Readiness describes reviewable dry-run evidence only."],
    blockers: ["Controlled skill execution authority is not implemented."],
  };
}
