import type { ActionInstanceIdentity } from "./provenance";

export type ApprovalRequestStatus = "pending" | "approved_once" | "rejected" | "expired" | "revoked";
export type ApprovalRequestRiskLevel = "low" | "medium" | "high" | "critical";
export type ApprovalRequestSourceType = "scheduler" | "tool" | "skill" | "network" | "shell" | "filesystem" | "memory_write" | "runtime";

export interface ApprovalRequest {
  approvalRequestId: string;
  actionDigest: string;
  title: string;
  description: string;
  riskLevel: ApprovalRequestRiskLevel;
  requestedBy: string;
  sourceType: ApprovalRequestSourceType;
  sourceId: string;
  provenanceIds: string[];
  status: ApprovalRequestStatus;
  createdAt: string;
  expiresAt?: string;
  decidedAt?: string;
  userSafeReason: string;
  actionPreview: Record<string, unknown>;
}

export interface CreateApprovalRequestMetadata {
  title: string;
  description: string;
  riskLevel?: ApprovalRequestRiskLevel;
  requestedBy?: string;
  sourceType: ApprovalRequestSourceType;
  sourceId: string;
  expiresAt?: string;
  userSafeReason?: string;
  actionPreview?: Record<string, unknown>;
}

export interface ApprovalRequestDiagnosticsSummary {
  totalRequests: number;
  pendingRequests: number;
  approvedOnceRequests: number;
  rejectedRequests: number;
  expiredRequests: number;
  revokedRequests: number;
}

export type ApprovalActionIdentity = ActionInstanceIdentity;
