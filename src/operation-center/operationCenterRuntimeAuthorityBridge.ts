import type { PersonalIntelligenceRuntimeAuthorityRecord } from "../personal-intelligence/runtimeAuthority";
import type { OperationCenterItem, OperationCenterStatus } from "./operationCenterTypes";

const statusByClass: Record<PersonalIntelligenceRuntimeAuthorityRecord["authorityClass"], OperationCenterStatus> = {
  permanently_blocked: "blocked",
  review_only: "ready_for_review",
  dry_run_only: "model_only",
  future_pilot_candidate: "approval_required",
  unsupported: "unsupported",
};
const mandatoryBlockedActions = [
  "skill execution", "tool invocation", "model call", "memory write", "LucaLink handoff",
  "runtime authority grant",
];

export function createOperationItemsFromRuntimeAuthorityRecords(
  records: readonly PersonalIntelligenceRuntimeAuthorityRecord[],
): OperationCenterItem[] {
  return records.map((record) => ({
    itemId: `operation:${record.authorityId}`,
    source: "personal_intelligence",
    category: "runtime_authority",
    title: `Runtime authority · ${record.capabilityKind.replace(/_/g, " ")}`,
    summary: `${record.authorityClass.replace(/_/g, " ")} classification; runtime authority remains disabled.`,
    status: statusByClass[record.authorityClass],
    riskLevel: record.riskLevel,
    createdAt: record.createdAt,
    relatedSkillId: record.skillId,
    relatedPlanId: record.planId,
    requiredApprovals: [...record.requiredApprovals],
    blockedActions: [...new Set([...mandatoryBlockedActions, ...record.blockedActions])],
    warnings: [...record.warnings],
    blockers: [...record.blockers],
    auditSummary: "Authority-boundary evidence only; no execution authority is granted.",
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
