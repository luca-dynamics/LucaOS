import {
  LUCA_LINK_RUNTIME_DISABLED_FLAGS,
  type LucaLinkRuntimeAuthorityEvidence,
  type LucaLinkRuntimeAuthorityEvidenceContext,
  type LucaLinkRuntimeAuthorityRecord,
} from "./lucaLinkRuntimeAuthorityTypes";

const copy = (values?: readonly string[]) => values ? [...values] : [];

export function createLucaLinkRuntimeAuthorityEvidence(
  record: LucaLinkRuntimeAuthorityRecord,
  context: LucaLinkRuntimeAuthorityEvidenceContext = {},
): LucaLinkRuntimeAuthorityEvidence {
  const sourceHost = record.requestedByHostId ?? "unscoped source host";
  const targetHost = record.targetHostId ?? "unscoped target host";
  const candidate = record.authorityClass === "future_bounded_handoff_candidate";
  return {
    authorityId: record.authorityId,
    sourceModel: `${record.source} / ${record.capabilityKind}`,
    hostScope: `${sourceHost} -> ${targetHost}`,
    transportPermission: context.transportPermission ?? "No transport send authority; review evidence only.",
    approvalPath: context.approvalPath ?? (record.requiredApprovals.length
      ? `Required review path: ${record.requiredApprovals.join(", ")}.`
      : "No approval path grants runtime authority."),
    dryRunHandoffEvidence: context.dryRunHandoffEvidence
      ?? (record.relatedSimulationId ? `Dry-run evidence ${record.relatedSimulationId} is non-authorizing.` : "No authorizing handoff evidence exists."),
    redactionAndExpiryRequirements: [
      ...copy(context.redactionRequirements),
      ...copy(context.expiryRequirements),
      "Redaction and expiry must be enforced by any separately reviewed future pilot.",
    ],
    blockedActions: [...record.blockedActions],
    fileInstallStatus: context.fileInstallStatus ?? "File writes and package installs remain disabled.",
    sensorRestrictions: [
      ...copy(context.sensorRestrictions),
      "Live sensor collection remains disabled.",
    ],
    displayRestrictions: [
      ...copy(context.displayRestrictions),
      "Display open and cast remain disabled.",
    ],
    futurePilotRequirements: [
      ...copy(context.futurePilotRequirements),
      "Separate explicit implementation and security review",
      "Enforced transport boundary, expiry, redaction, rollback, and durable audit",
      candidate ? "Candidate evidence may be reviewed; it cannot be sent or executed." : "A complete candidate evidence set is required before pilot review.",
    ],
    warnings: [...record.warnings, "No evidence item grants authority."],
    blockers: [...record.blockers],
    ...LUCA_LINK_RUNTIME_DISABLED_FLAGS,
  };
}
