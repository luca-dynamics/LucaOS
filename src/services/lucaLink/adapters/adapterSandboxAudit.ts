import type {
  LucaLinkAdapterExecutionPlan,
  LucaLinkAdapterRiskLevel,
} from "./adapterSandboxTypes";

export type LucaLinkAdapterSandboxAuditEventType =
  | "manifest_validated"
  | "plan_created"
  | "plan_blocked"
  | "approval_required"
  | "dry_run_ready";

export interface LucaLinkAdapterSandboxAuditRecord {
  auditId: string;
  timestamp: string;
  adapterId: string;
  hostId: string;
  targetHostId: string;
  eventType: LucaLinkAdapterSandboxAuditEventType;
  summary: string;
  riskLevel: LucaLinkAdapterRiskLevel;
  blockers: string[];
  warnings: string[];
  sideEffectsPerformed: false;
}

export interface CreateAdapterSandboxAuditRecordInput {
  plan: LucaLinkAdapterExecutionPlan;
  timestamp?: string;
  eventType?: LucaLinkAdapterSandboxAuditEventType;
  summary?: string;
}

function eventTypeForPlan(
  plan: LucaLinkAdapterExecutionPlan,
): LucaLinkAdapterSandboxAuditEventType {
  if (plan.status === "blocked" || plan.status === "rejected")
    return "plan_blocked";
  if (plan.status === "approval_required") return "approval_required";
  return "dry_run_ready";
}

export function createAdapterSandboxAuditRecord({
  plan,
  timestamp = new Date().toISOString(),
  eventType = eventTypeForPlan(plan),
  summary = `Adapter sandbox plan ${plan.status}; no side effects performed.`,
}: CreateAdapterSandboxAuditRecordInput): LucaLinkAdapterSandboxAuditRecord {
  return {
    auditId: `adapter-audit-${plan.planId}-${timestamp}`,
    timestamp,
    adapterId: plan.adapterId,
    hostId: plan.requestedByHostId,
    targetHostId: plan.targetHostId,
    eventType,
    summary,
    riskLevel: plan.riskLevel,
    blockers: [...plan.blockers],
    warnings: [...plan.warnings],
    sideEffectsPerformed: false,
  };
}

export function summarizeAdapterSandboxAudit(
  records: readonly LucaLinkAdapterSandboxAuditRecord[],
): {
  total: number;
  blocked: number;
  approvalRequired: number;
  dryRunReady: number;
  sideEffectsPerformed: false;
} {
  return {
    total: records.length,
    blocked: records.filter((record) => record.eventType === "plan_blocked")
      .length,
    approvalRequired: records.filter(
      (record) => record.eventType === "approval_required",
    ).length,
    dryRunReady: records.filter(
      (record) => record.eventType === "dry_run_ready",
    ).length,
    sideEffectsPerformed: false,
  };
}
