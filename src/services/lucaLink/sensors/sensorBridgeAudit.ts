import { evaluateLucaLinkReadOnlySensorPolicy } from "./sensorBridgePolicy";
import { summarizeLucaLinkReadOnlySensorSnapshot } from "./sensorSnapshot";
import type {
  LucaLinkReadOnlySensorSnapshot,
  LucaLinkSensorBridgeAuditEventType,
  LucaLinkSensorBridgeAuditRecord,
} from "./sensorBridgeTypes";

export interface CreateLucaLinkSensorBridgeAuditRecordInput {
  auditId: string;
  timestamp: string;
  eventType: LucaLinkSensorBridgeAuditEventType;
  summary?: string;
}

export function createLucaLinkSensorBridgeAuditRecord(
  snapshot: LucaLinkReadOnlySensorSnapshot,
  input: CreateLucaLinkSensorBridgeAuditRecordInput,
): LucaLinkSensorBridgeAuditRecord {
  const evaluation = evaluateLucaLinkReadOnlySensorPolicy(snapshot, {
    now: input.timestamp,
  });
  return {
    auditId: input.auditId,
    snapshotId: snapshot.snapshotId,
    hostId: snapshot.hostId,
    timestamp: input.timestamp,
    eventType: input.eventType,
    summary: input.summary ?? summarizeLucaLinkReadOnlySensorSnapshot(snapshot),
    allowedSensorKinds: [...evaluation.allowedSensorKinds],
    blockedSensorKinds: [...evaluation.blockedSensorKinds],
    warnings: [...evaluation.warnings],
    blockers: [...evaluation.blockers],
    sideEffectsPerformed: false,
  };
}

export function summarizeLucaLinkSensorBridgeAudit(
  records: readonly LucaLinkSensorBridgeAuditRecord[],
): string {
  const blocked = records.filter(
    (record) => record.eventType === "blocked",
  ).length;
  const expired = records.filter(
    (record) => record.eventType === "expired",
  ).length;
  return `${records.length} sensor bridge audit record(s); ${blocked} blocked, ${expired} expired; audit-only with sideEffectsPerformed false.`;
}
