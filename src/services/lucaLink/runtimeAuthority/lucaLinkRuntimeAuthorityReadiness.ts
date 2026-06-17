import type { LucaLinkRuntimeAuthorityReadiness, LucaLinkRuntimeAuthorityRecord } from "./lucaLinkRuntimeAuthorityTypes";

export function summarizeLucaLinkRuntimeAuthority(records: readonly LucaLinkRuntimeAuthorityRecord[]): LucaLinkRuntimeAuthorityReadiness {
  const count = (authorityClass: LucaLinkRuntimeAuthorityRecord["authorityClass"]) => records.filter((record) => record.authorityClass === authorityClass).length;
  return {
    totalRecords: records.length,
    permanentlyBlocked: count("permanently_blocked"),
    reviewOnly: count("review_only"),
    dryRunOnly: count("dry_run_only"),
    futureBoundedHandoffCandidates: count("future_bounded_handoff_candidate"),
    unsupported: count("unsupported"),
    highRiskCount: records.filter((record) => record.riskLevel === "high").length,
    criticalRiskCount: records.filter((record) => record.riskLevel === "critical").length,
    warnings: ["Runtime authority is not granted.", "Future bounded handoff candidates are not sendable or executable."],
    blockers: [...new Set(records.flatMap((record) => record.blockers))],
    authorityGranted: false,
    handoffEnabled: false,
    transportSendEnabled: false,
    adapterExecutionEnabled: false,
    displayOpenEnabled: false,
    sensorCollectionEnabled: false,
    fileWriteEnabled: false,
    installEnabled: false,
    sideEffectsPerformed: false,
  };
}
