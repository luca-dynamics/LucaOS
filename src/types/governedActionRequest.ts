import type { ApprovalRequestRiskLevel } from "./approvalCenter";

export type GovernedActionRequestKind = "tool" | "skill" | "network" | "shell" | "filesystem" | "memory_write";
export type GovernedActionRequestStatus =
  | "proposed"
  | "approval_required"
  | "approved_waiting_execution"
  | "rejected"
  | "blocked"
  | "expired"
  | "executed_elsewhere";

export interface GovernedActionRequest {
  requestId: string;
  kind: GovernedActionRequestKind;
  title: string;
  description: string;
  requestedCapability: string;
  target: string;
  parametersPreview: Record<string, unknown>;
  provenanceIds: string[];
  actionDigest: string;
  approvalRequestId?: string;
  status: GovernedActionRequestStatus;
  createdAt: string;
  updatedAt: string;
  riskLevel: ApprovalRequestRiskLevel;
  dryRunOnly: true;
}

export interface GovernedActionRequestDiagnosticsSummary {
  totalRequests: number;
  proposedRequests: number;
  approvalRequiredRequests: number;
  approvedWaitingExecutionRequests: number;
  rejectedRequests: number;
  blockedRequests: number;
  dryRunOnly: true;
}
