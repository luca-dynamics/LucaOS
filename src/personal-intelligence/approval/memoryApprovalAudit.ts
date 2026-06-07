import type { GovernedMemoryAdapterStatus } from "../adapters";

export type PersonalIntelligenceMemoryApprovalAuditEventType =
  | "pilot_viewed"
  | "dry_run_requested"
  | "dry_run_completed"
  | "live_write_requested"
  | "live_write_blocked"
  | "live_write_completed"
  | "live_write_failed";

export interface PersonalIntelligenceMemoryApprovalAuditRecord {
  auditId: string;
  proposalId: string;
  timestamp: string;
  eventType: PersonalIntelligenceMemoryApprovalAuditEventType;
  summary: string;
  sideEffectsPerformed: boolean;
  adapterResultStatus?: GovernedMemoryAdapterStatus;
  blockers: string[];
  warnings: string[];
}

export interface CreateMemoryApprovalAuditRecordInput {
  auditId: string;
  proposalId: string;
  timestamp?: string;
  eventType: PersonalIntelligenceMemoryApprovalAuditEventType;
  summary: string;
  sideEffectsPerformed?: boolean;
  adapterResultStatus?: GovernedMemoryAdapterStatus;
  blockers?: string[];
  warnings?: string[];
  now?: () => Date;
}

export interface MemoryApprovalAuditSummary {
  totalRecords: number;
  recordsByEventType: Partial<
    Record<PersonalIntelligenceMemoryApprovalAuditEventType, number>
  >;
  proposalIds: string[];
  sideEffectsPerformedCount: number;
  blockedCount: number;
  warningCount: number;
}

export function createMemoryApprovalAuditRecord(
  input: CreateMemoryApprovalAuditRecordInput,
): PersonalIntelligenceMemoryApprovalAuditRecord {
  return {
    auditId: input.auditId,
    proposalId: input.proposalId,
    timestamp:
      input.timestamp ?? (input.now ?? (() => new Date()))().toISOString(),
    eventType: input.eventType,
    summary: input.summary,
    sideEffectsPerformed: input.sideEffectsPerformed === true,
    adapterResultStatus: input.adapterResultStatus,
    blockers: [...(input.blockers ?? [])],
    warnings: [...(input.warnings ?? [])],
  };
}

export function summarizeMemoryApprovalAudit(
  records: readonly PersonalIntelligenceMemoryApprovalAuditRecord[],
): MemoryApprovalAuditSummary {
  const recordsByEventType: MemoryApprovalAuditSummary["recordsByEventType"] =
    {};
  for (const record of records) {
    recordsByEventType[record.eventType] =
      (recordsByEventType[record.eventType] ?? 0) + 1;
  }
  return {
    totalRecords: records.length,
    recordsByEventType,
    proposalIds: Array.from(new Set(records.map((record) => record.proposalId))),
    sideEffectsPerformedCount: records.filter(
      (record) => record.sideEffectsPerformed,
    ).length,
    blockedCount: records.filter(
      (record) =>
        record.eventType === "live_write_blocked" ||
        record.adapterResultStatus === "blocked",
    ).length,
    warningCount: records.reduce(
      (total, record) => total + record.warnings.length,
      0,
    ),
  };
}
