import type { OperationCenterItem } from "./operationCenterTypes";

export interface OperationCenterAuditSummary {
  itemId: string;
  source: OperationCenterItem["source"];
  status: OperationCenterItem["status"];
  summary: string;
  sideEffectsPerformed: false;
}

export function createOperationCenterAuditSummaries(items: readonly OperationCenterItem[]): OperationCenterAuditSummary[] {
  return items.map((item) => ({
    itemId: item.itemId,
    source: item.source,
    status: item.status,
    summary: item.auditSummary ?? `${item.title}: ${item.status.replace(/_/g, " ")}.`,
    sideEffectsPerformed: false,
  }));
}
