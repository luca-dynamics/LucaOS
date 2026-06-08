import {
  LUCA_LINK_RUNTIME_DISABLED_FLAGS,
  type LucaLinkRuntimeAuthorityReadiness,
  type LucaLinkRuntimeAuthorityRecord,
} from "./lucaLinkRuntimeAuthorityTypes";

const unique = (values: readonly string[]) => [...new Set(values.filter(Boolean))];

export function summarizeLucaLinkRuntimeAuthority(
  records: readonly LucaLinkRuntimeAuthorityRecord[],
): LucaLinkRuntimeAuthorityReadiness {
  return {
    totalRecords: records.length,
    permanentlyBlocked: records.filter((record) => record.authorityClass === "permanently_blocked").length,
    reviewOnly: records.filter((record) => record.authorityClass === "review_only").length,
    dryRunOnly: records.filter((record) => record.authorityClass === "dry_run_only").length,
    futureBoundedHandoffCandidates: records.filter((record) => record.authorityClass === "future_bounded_handoff_candidate").length,
    unsupported: records.filter((record) => record.authorityClass === "unsupported").length,
    highRiskCount: records.filter((record) => record.riskLevel === "high").length,
    criticalRiskCount: records.filter((record) => record.riskLevel === "critical").length,
    warnings: unique([
      "Runtime authority is not granted.",
      "Future bounded handoff candidate does not mean sendable.",
      "Dry-run success does not authorize handoff.",
      ...records.flatMap((record) => record.warnings),
    ]),
    blockers: unique([
      "No transport, adapter, display, sensor, file, install, or host mutation is performed.",
      ...records.flatMap((record) => record.blockers),
    ]),
    ...LUCA_LINK_RUNTIME_DISABLED_FLAGS,
  };
}
