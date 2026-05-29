export type MemoryProposalStatus =
  | "proposed"
  | "approval_required"
  | "approved_waiting_write"
  | "written"
  | "rejected"
  | "blocked"
  | "expired"
  | "revoked";

export type MemoryProposalKind =
  | "user_fact"
  | "preference"
  | "project_context"
  | "session_summary"
  | "agent_state"
  | "correction"
  | "reminder_context"
  | "other";

export type MemoryProposalRiskLevel = "safe" | "low" | "elevated" | "high";

export interface MemoryProposalRecord {
  proposalId: string;
  title: string;
  summary: string;
  proposedMemory: string;
  kind: MemoryProposalKind;
  source: string;
  sourceId?: string;
  provenanceIds: string[];
  actionDigest: string;
  approvalRequestId?: string;
  status: MemoryProposalStatus;
  riskLevel: MemoryProposalRiskLevel;
  confidence: number;
  reason: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  writtenAt?: string;
  memoryId?: string;
  blockedBy?: string[];
  metadata: Record<string, unknown>;
}

export interface MemoryProposalDiagnosticsSummary {
  totalProposals: number;
  proposedProposals: number;
  approvalRequiredProposals: number;
  approvedWaitingWriteProposals: number;
  writtenProposals: number;
  rejectedProposals: number;
  blockedProposals: number;
  revokedProposals: number;
  expiredProposals: number;
}

export interface MemoryWriteRecord {
  writeId: string;
  proposalId: string;
  memoryId?: string;
  approvalRequestId?: string;
  actionDigest: string;
  provenanceIds: string[];
  riskLevel: MemoryProposalRiskLevel;
  status: "succeeded" | "blocked" | "failed";
  summary: string;
  blockedBy?: string[];
  consumedApproval: boolean;
  createdAt: string;
}

export interface MemoryWriteDiagnosticsSummary {
  totalWrites: number;
  succeededWrites: number;
  blockedWrites: number;
  failedWrites: number;
  lastWriteAt?: string;
}

export const MEMORY_PROPOSAL_WRITABLE_RISK_LEVELS: MemoryProposalRiskLevel[] = ["safe", "low"];

export const MEMORY_PROPOSAL_MAX_SUMMARY_LENGTH = 2_000;
export const MEMORY_PROPOSAL_MAX_MEMORY_LENGTH = 4_000;
