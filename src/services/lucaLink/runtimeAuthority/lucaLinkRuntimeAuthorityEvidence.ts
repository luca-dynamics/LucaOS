import type { LucaLinkRuntimeAuthorityEvidence, LucaLinkRuntimeAuthorityRecord } from "./lucaLinkRuntimeAuthorityTypes";

export interface LucaLinkRuntimeAuthorityEvidenceContext {
  transportPermission?: string;
  approvalPath?: readonly string[];
  dryRunHandoffEvidence?: readonly string[];
  redactionAndExpiryRequirements?: readonly string[];
  fileInstallStatus?: string;
  sensorRestrictions?: readonly string[];
  displayRestrictions?: readonly string[];
}

export function createLucaLinkRuntimeAuthorityEvidence(
  record: LucaLinkRuntimeAuthorityRecord,
  context: LucaLinkRuntimeAuthorityEvidenceContext = {},
): LucaLinkRuntimeAuthorityEvidence {
  return {
    authorityId: record.authorityId,
    sourceModel: record.source,
    hostScope: [record.requestedByHostId, record.targetHostId, record.targetDeviceId].filter((value): value is string => Boolean(value)),
    transportPermission: context.transportPermission ?? "No live transport permission is granted.",
    approvalPath: [...(context.approvalPath ?? record.requiredApprovals)],
    dryRunHandoffEvidence: [...(context.dryRunHandoffEvidence ?? [])],
    redactionAndExpiryRequirements: [...(context.redactionAndExpiryRequirements ?? record.requiredHostBoundary.filter((item) => /expiry|redaction/.test(item)))],
    blockedActions: [...record.blockedActions],
    fileInstallStatus: context.fileInstallStatus ?? "File write and package install remain disabled.",
    sensorRestrictions: [...(context.sensorRestrictions ?? ["No live sensor collection."])],
    displayRestrictions: [...(context.displayRestrictions ?? ["No display open or cast."])],
    futurePilotRequirements: [...record.requiredEvidence, ...record.requiredHostBoundary],
    warnings: [...record.warnings, "Evidence is descriptive and grants no authority."],
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
