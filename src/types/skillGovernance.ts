import type { ApprovalRequestRiskLevel } from "./approvalCenter";

export type SkillGovernanceRequestStatus =
  | "proposed"
  | "approval_required"
  | "approved_waiting_install"
  | "approved_waiting_execution"
  | "rejected"
  | "blocked"
  | "expired"
  | "revoked";

export type SkillGovernanceRequestType =
  | "install"
  | "enable"
  | "run"
  | "update"
  | "remove";

export interface SkillGovernanceRequest {
  skillRequestId: string;
  skillId: string;
  skillName: string;
  requestType: SkillGovernanceRequestType;
  title: string;
  description: string;
  requestedCapabilities: string[];
  riskLevel: ApprovalRequestRiskLevel;
  provenanceIds: string[];
  actionDigest: string;
  approvalRequestId?: string;
  status: SkillGovernanceRequestStatus;
  createdAt: string;
  updatedAt: string;
  blockedBy?: string[];
  metadata: Record<string, unknown>;
}

export interface SkillGovernanceDiagnosticsSummary {
  totalRequests: number;
  proposedRequests: number;
  approvalRequiredRequests: number;
  approvedWaitingRequests: number;
  rejectedRequests: number;
  blockedRequests: number;
  revokedRequests: number;
  expiredRequests: number;
  canAutoExecute: false;
}

export const SKILL_GOVERNANCE_RISKY_CAPABILITIES = [
  "shell",
  "filesystem",
  "network",
  "browser",
  "desktop",
  "device",
  "wallet",
  "finance",
  "trading",
  "mcp",
  "exec",
  "process",
] as const;
