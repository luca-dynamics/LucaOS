import type {
  LucaLinkMessageClass,
  LucaLinkTransportChannel,
  LucaLinkTransportPermissionDecision,
  LucaLinkTransportPermissionRequest,
  LucaLinkTransportRiskLevel,
} from "./transportPermissionTypes";

export type LucaLinkTransportPermissionAuditEventType =
  | "requested"
  | "evaluated"
  | "approval_required"
  | "allowed_preview"
  | "blocked"
  | "expired"
  | "unsupported";
export interface LucaLinkTransportPermissionAuditRecord {
  auditId: string;
  requestId: string;
  decisionId?: string;
  timestamp: string;
  eventType: LucaLinkTransportPermissionAuditEventType;
  channel: LucaLinkTransportChannel;
  messageClass: LucaLinkMessageClass;
  riskLevel: LucaLinkTransportRiskLevel;
  summary: string;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}
export interface LucaLinkTransportPermissionAuditSummary {
  totalRecords: number;
  byEventType: Partial<
    Record<LucaLinkTransportPermissionAuditEventType, number>
  >;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export function createLucaLinkTransportPermissionAuditRecord(input: {
  request: LucaLinkTransportPermissionRequest;
  decision?: LucaLinkTransportPermissionDecision;
  eventType?: LucaLinkTransportPermissionAuditEventType;
  timestamp?: string;
  summary?: string;
}): LucaLinkTransportPermissionAuditRecord {
  const eventType = input.eventType ?? input.decision?.status ?? "requested";
  return {
    auditId: `transport-audit-${input.request.requestId}-${eventType}`,
    requestId: input.request.requestId,
    decisionId: input.decision?.decisionId,
    timestamp: input.timestamp ?? input.request.createdAt,
    eventType,
    channel: input.request.channel,
    messageClass: input.request.messageClass,
    riskLevel: input.request.riskLevel,
    summary:
      input.summary ??
      input.decision?.reason ??
      "Transport permission request recorded for policy preview.",
    warnings: [...input.request.warnings, ...(input.decision?.warnings ?? [])],
    blockers: [...input.request.blockers, ...(input.decision?.blockers ?? [])],
    sideEffectsPerformed: false,
  };
}

export function summarizeLucaLinkTransportPermissionAudit(
  records: readonly LucaLinkTransportPermissionAuditRecord[],
): LucaLinkTransportPermissionAuditSummary {
  const byEventType: LucaLinkTransportPermissionAuditSummary["byEventType"] =
    {};
  records.forEach((record) => {
    byEventType[record.eventType] = (byEventType[record.eventType] ?? 0) + 1;
  });
  return {
    totalRecords: records.length,
    byEventType,
    warnings: Array.from(new Set(records.flatMap((r) => r.warnings))),
    blockers: Array.from(new Set(records.flatMap((r) => r.blockers))),
    sideEffectsPerformed: false,
  };
}
