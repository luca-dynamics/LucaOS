import type { LucaLinkDryRunHandoffAuditEventType, LucaLinkDryRunHandoffAuditRecord, LucaLinkDryRunHandoffAuditSummary, LucaLinkDryRunHandoffSimulation } from "./dryRunHandoffTypes";

export function createLucaLinkDryRunHandoffAuditRecord(
  simulation: LucaLinkDryRunHandoffSimulation,
  eventType: LucaLinkDryRunHandoffAuditEventType = simulation.status === "disabled" ? "simulated" : simulation.status,
): LucaLinkDryRunHandoffAuditRecord {
  return {
    auditId: `audit:${simulation.simulationId}:${eventType}`,
    simulationId: simulation.simulationId,
    timestamp: simulation.createdAt,
    eventType,
    summary: `LucaLink dry-run handoff is ${simulation.status.replace(/_/g, " ")}; no runtime action was performed.`,
    blockedActions: [...simulation.blockedActions],
    warnings: [...simulation.warnings],
    blockers: [...simulation.blockers],
    sideEffectsPerformed: false,
  };
}

export function summarizeLucaLinkDryRunHandoffAudit(records: readonly LucaLinkDryRunHandoffAuditRecord[]): LucaLinkDryRunHandoffAuditSummary {
  const count = (event: LucaLinkDryRunHandoffAuditEventType) => records.filter((item) => item.eventType === event).length;
  return {
    totalRecords: records.length,
    approvalRequired: count("approval_required"),
    blocked: count("blocked"),
    readyForReview: count("ready_for_review"),
    unsupported: count("unsupported"),
    verified: count("verified"),
    sideEffectsPerformed: false,
    warnings: [...new Set(records.flatMap((item) => item.warnings))],
    blockers: [...new Set(records.flatMap((item) => item.blockers))],
  };
}
