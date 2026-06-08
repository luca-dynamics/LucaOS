import type { LucaLinkRuntimeAuthorityRecord } from "../services/lucaLink/runtimeAuthority";
import type { OperationCenterItem, OperationCenterStatus } from "./operationCenterTypes";

const statusByClass: Record<LucaLinkRuntimeAuthorityRecord["authorityClass"], OperationCenterStatus> = {
  permanently_blocked: "blocked",
  review_only: "ready_for_review",
  dry_run_only: "model_only",
  future_bounded_handoff_candidate: "approval_required",
  unsupported: "unsupported",
};
const mandatoryBlockedActions = [
  "live handoff", "transport send", "adapter execution", "display open/cast", "sensor collection", "file write", "install",
  "runtime authority grant",
];

export function createOperationItemsFromLucaLinkRuntimeAuthorityRecords(
  records: readonly LucaLinkRuntimeAuthorityRecord[],
): OperationCenterItem[] {
  return records.map((record) => ({
    itemId: `operation:${record.authorityId}`,
    source: "lucalink",
    category: "lucalink_runtime_authority",
    title: `LucaLink runtime authority · ${record.capabilityKind.replace(/_/g, " ")}`,
    summary: `${record.authorityClass.replace(/_/g, " ")} classification; LucaLink runtime authority remains disabled.`,
    status: statusByClass[record.authorityClass],
    riskLevel: record.riskLevel,
    createdAt: record.createdAt,
    relatedHostId: record.targetHostId ?? record.requestedByHostId,
    relatedRequestId: record.relatedRequestId,
    requiredApprovals: [...record.requiredApprovals],
    blockedActions: [...new Set([...mandatoryBlockedActions, ...record.blockedActions])],
    warnings: [...record.warnings],
    blockers: [...record.blockers],
    auditSummary: "LucaLink authority-boundary evidence only; no handoff, send, execution, display, collection, write, or install authority is granted.",
    sideEffectsPerformed: false,
    authorityGranted: false,
    executionEnabled: false,
    canExecute: false,
    readyForExecution: false,
  }));
}
