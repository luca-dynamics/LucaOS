import type { LucaLinkRuntimeAuthorityRecord } from "../services/lucaLink/runtimeAuthority";
import type { OperationCenterItem, OperationCenterStatus } from "./operationCenterTypes";

const statusByClass: Record<LucaLinkRuntimeAuthorityRecord["authorityClass"], OperationCenterStatus> = {
  permanently_blocked: "blocked",
  review_only: "ready_for_review",
  dry_run_only: "model_only",
  future_bounded_handoff_candidate: "approval_required",
  unsupported: "unsupported",
};

export function createOperationItemsFromLucaLinkRuntimeAuthorityRecords(
  records: readonly LucaLinkRuntimeAuthorityRecord[],
): OperationCenterItem[] {
  return records.map((record) => ({
    itemId: `operation:${record.authorityId}`,
    source: "lucalink",
    category: "lucalink_runtime_authority",
    title: `LucaLink runtime authority: ${record.capabilityKind.replace(/_/g, " ")}`,
    summary: `${record.authorityClass.replace(/_/g, " ")} boundary classification; runtime authority remains disabled.`,
    status: statusByClass[record.authorityClass],
    riskLevel: record.riskLevel,
    createdAt: record.createdAt,
    relatedHostId: record.targetHostId,
    relatedRequestId: record.relatedRequestId,
    requiredApprovals: [...record.requiredApprovals],
    blockedActions: [...record.blockedActions],
    warnings: [...record.warnings],
    blockers: [...record.blockers],
    auditSummary: "Authority-boundary evidence only; no handoff, send, execution, collection, write, install, or host mutation is enabled.",
    authorityGranted: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
    handoffEnabled: false,
    transportSendEnabled: false,
    adapterExecutionEnabled: false,
    displayOpenEnabled: false,
    sensorCollectionEnabled: false,
    fileWriteEnabled: false,
    installEnabled: false,
    sideEffectsPerformed: false,
  }));
}
