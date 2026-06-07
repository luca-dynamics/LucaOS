import type {
  LucaLinkWebDisplayBridgeAuditEventType,
  LucaLinkWebDisplayBridgeAuditRecord,
  LucaLinkWebDisplayRiskLevel,
  LucaLinkWebDisplaySessionIntent,
} from "./webDisplayBridgeTypes";

export interface CreateLucaLinkWebDisplayBridgeAuditRecordInput {
  auditId?: string;
  intent: LucaLinkWebDisplaySessionIntent;
  eventType: LucaLinkWebDisplayBridgeAuditEventType;
  summary: string;
  timestamp?: string;
  riskLevel?: LucaLinkWebDisplayRiskLevel;
  blockers?: string[];
  warnings?: string[];
}

export interface LucaLinkWebDisplayBridgeAuditSummary {
  total: number;
  byEventType: Record<LucaLinkWebDisplayBridgeAuditEventType, number>;
  blocked: number;
  expired: number;
  previewCreated: number;
  sideEffectsPerformed: false;
}

export function createLucaLinkWebDisplayBridgeAuditRecord({
  auditId,
  intent,
  eventType,
  summary,
  timestamp = new Date().toISOString(),
  riskLevel = intent.riskLevel,
  blockers = intent.blockers,
  warnings = intent.warnings,
}: CreateLucaLinkWebDisplayBridgeAuditRecordInput): LucaLinkWebDisplayBridgeAuditRecord {
  return {
    auditId: auditId ?? `display-audit-${intent.sessionId}-${eventType}-${new Date(timestamp).getTime()}`,
    sessionId: intent.sessionId,
    timestamp,
    eventType,
    summary,
    riskLevel,
    blockers: [...blockers],
    warnings: [...warnings],
    sideEffectsPerformed: false,
  };
}

export function summarizeLucaLinkWebDisplayBridgeAudit(
  records: readonly LucaLinkWebDisplayBridgeAuditRecord[],
): LucaLinkWebDisplayBridgeAuditSummary {
  const byEventType: LucaLinkWebDisplayBridgeAuditSummary["byEventType"] = {
    created: 0,
    validated: 0,
    approval_required: 0,
    approved_preview: 0,
    blocked: 0,
    expired: 0,
    preview_created: 0,
  };
  for (const record of records) byEventType[record.eventType] += 1;
  return {
    total: records.length,
    byEventType,
    blocked: byEventType.blocked,
    expired: byEventType.expired,
    previewCreated: byEventType.preview_created,
    sideEffectsPerformed: false,
  };
}
