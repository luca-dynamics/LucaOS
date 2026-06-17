import type { PersonalIntelligenceRuntimeAuthorityReadiness, PersonalIntelligenceRuntimeAuthorityRecord } from "./runtimeAuthorityTypes";
export function summarizePersonalIntelligenceRuntimeAuthority(records: readonly PersonalIntelligenceRuntimeAuthorityRecord[]): PersonalIntelligenceRuntimeAuthorityReadiness {
  const count = (value: PersonalIntelligenceRuntimeAuthorityRecord["authorityClass"]) => records.filter((record) => record.authorityClass === value).length;
  return {
    totalRecords: records.length, permanentlyBlocked: count("permanently_blocked"), reviewOnly: count("review_only"), dryRunOnly: count("dry_run_only"), futurePilotCandidates: count("future_pilot_candidate"), unsupported: count("unsupported"),
    highRiskCount: records.filter((record) => record.riskLevel === "high").length, criticalRiskCount: records.filter((record) => record.riskLevel === "critical").length,
    authorityGranted: false, executionEnabled: false, canExecute: false, readyForExecution: false, sideEffectsPerformed: false,
    warnings: ["Authority summary is advisory and side-effect-free.", "Future pilot candidates are not executable."],
    blockers: [...new Set(records.flatMap((record) => record.blockers))],
  };
}
