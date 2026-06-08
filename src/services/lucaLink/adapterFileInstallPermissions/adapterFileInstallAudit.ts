import type { LucaLinkAdapterFileInstallPermissionDecision, LucaLinkAdapterFileInstallPermissionRequest, LucaLinkAdapterFileInstallRiskLevel } from "./adapterFileInstallTypes";

export type LucaLinkAdapterFileInstallPermissionAuditEventType = "requested" | "evaluated" | "ready_for_review" | "approval_required" | "blocked" | "expired" | "unsupported";
export interface LucaLinkAdapterFileInstallPermissionAuditRecord {
  auditId: string;
  requestId: string;
  decisionId?: string;
  timestamp: string;
  operation: "file_write" | "install";
  eventType: LucaLinkAdapterFileInstallPermissionAuditEventType;
  riskLevel: LucaLinkAdapterFileInstallRiskLevel;
  summary: string;
  warnings: string[];
  blockers: string[];
  writeEnabled: false;
  installEnabled: false;
  sideEffectsPerformed: false;
}
export interface LucaLinkAdapterFileInstallPermissionAuditSummary {
  totalRecords: number;
  requested: number;
  evaluated: number;
  blocked: number;
  approvalRequired: number;
  sideEffectsPerformed: false;
}

export function createAdapterFileInstallPermissionAuditRecord(request: LucaLinkAdapterFileInstallPermissionRequest, decision?: LucaLinkAdapterFileInstallPermissionDecision, options: { timestamp?: string; eventType?: LucaLinkAdapterFileInstallPermissionAuditEventType; summary?: string } = {}): LucaLinkAdapterFileInstallPermissionAuditRecord {
  const eventType = options.eventType ?? decision?.status ?? "requested";
  return { auditId: `file-install-audit-${request.requestId}-${eventType}`, requestId: request.requestId, decisionId: decision?.decisionId, timestamp: options.timestamp ?? request.createdAt, operation: request.operation, eventType, riskLevel: request.riskLevel, summary: options.summary ?? `${request.operation} permission ${eventType}; no write or install authority granted.`, warnings: [...(decision?.warnings ?? request.warnings)], blockers: [...(decision?.blockers ?? request.blockers)], writeEnabled: false, installEnabled: false, sideEffectsPerformed: false };
}

export function summarizeAdapterFileInstallPermissionAudit(records: readonly LucaLinkAdapterFileInstallPermissionAuditRecord[]): LucaLinkAdapterFileInstallPermissionAuditSummary {
  return { totalRecords: records.length, requested: records.filter((item) => item.eventType === "requested").length, evaluated: records.filter((item) => item.eventType === "evaluated").length, blocked: records.filter((item) => item.eventType === "blocked").length, approvalRequired: records.filter((item) => item.eventType === "approval_required").length, sideEffectsPerformed: false };
}
