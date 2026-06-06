import type { PrivacyZone } from "../privacy/privacyZones";

export type PersistenceAuditEventType =
  | "created"
  | "validated"
  | "approved_for_future_adapter"
  | "rejected"
  | "cancelled"
  | "blocked"
  | "rollback_planned"
  | "delete_planned";
export type PersistenceAuditActor = "user" | "system" | "preview" | "test";

export interface PersonalIntelligencePersistenceAuditRecord {
  auditId: string;
  proposalId: string;
  eventType: PersistenceAuditEventType;
  timestamp: string;
  actor: PersistenceAuditActor;
  summary: string;
  privacyZone: PrivacyZone;
  sideEffectsPerformed: false;
  notes: string[];
}

export interface CreatePersistenceAuditRecordInput {
  auditId: string;
  proposalId: string;
  eventType: PersistenceAuditEventType;
  timestamp?: string;
  actor: PersistenceAuditActor;
  summary: string;
  privacyZone: PrivacyZone;
  notes?: string[];
  now?: () => Date;
}

export interface PersistenceAuditSummary {
  totalRecords: number;
  recordsByEventType: Partial<Record<PersistenceAuditEventType, number>>;
  proposalIds: string[];
  sideEffectsPerformed: false;
}

export function createPersistenceAuditRecord(
  input: CreatePersistenceAuditRecordInput,
): PersonalIntelligencePersistenceAuditRecord {
  return {
    auditId: input.auditId,
    proposalId: input.proposalId,
    eventType: input.eventType,
    timestamp:
      input.timestamp ?? (input.now ?? (() => new Date()))().toISOString(),
    actor: input.actor,
    summary: input.summary,
    privacyZone: input.privacyZone,
    sideEffectsPerformed: false,
    notes: [...(input.notes ?? [])],
  };
}

export function appendPersistenceAuditRecord(
  records: readonly PersonalIntelligencePersistenceAuditRecord[],
  record: PersonalIntelligencePersistenceAuditRecord,
): PersonalIntelligencePersistenceAuditRecord[] {
  return [...records.map(cloneAuditRecord), cloneAuditRecord(record)];
}

export function summarizePersistenceAudit(
  records: readonly PersonalIntelligencePersistenceAuditRecord[],
): PersistenceAuditSummary {
  const recordsByEventType: Partial<Record<PersistenceAuditEventType, number>> =
    {};
  for (const record of records) {
    recordsByEventType[record.eventType] =
      (recordsByEventType[record.eventType] ?? 0) + 1;
  }
  return {
    totalRecords: records.length,
    recordsByEventType,
    proposalIds: Array.from(
      new Set(records.map((record) => record.proposalId)),
    ),
    sideEffectsPerformed: false,
  };
}

function cloneAuditRecord(
  record: PersonalIntelligencePersistenceAuditRecord,
): PersonalIntelligencePersistenceAuditRecord {
  return { ...record, notes: [...record.notes], sideEffectsPerformed: false };
}
