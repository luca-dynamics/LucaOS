import type { ProvenanceMetadata } from "./provenance";

export type MemoryGovernanceWritePolicy = "auto_allowed_low_risk" | "approval_required" | "never_auto_write" | "temporary_only" | "local_only";
export type MemoryGovernanceRetrievalPolicy = "normal" | "local_only" | "approval_required" | "never_retrieve";
export type MemoryGovernanceType = "profile" | "conversation" | "operational" | "preference" | "artifact" | "unknown";
export type MemoryGovernanceReviewState = "unreviewed" | "user_approved" | "rejected";

export interface MemoryGovernanceRecord {
  memoryId: string;
  memoryType: MemoryGovernanceType;
  category: string;
  source: string;
  provenance?: ProvenanceMetadata;
  confidence: number;
  userVisible: boolean;
  editable: boolean;
  deletable: boolean;
  quarantined: boolean;
  expiresAt?: string;
  lastAccessedAt?: string;
  writePolicy: MemoryGovernanceWritePolicy;
  retrievalPolicy: MemoryGovernanceRetrievalPolicy;
  reviewState: MemoryGovernanceReviewState;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryWriteRiskInput {
  memoryType?: MemoryGovernanceType;
  category?: string;
  source?: string;
  confidence?: number;
  containsSensitiveData?: boolean;
  writesOperationalInstruction?: boolean;
  isTemporary?: boolean;
  localOnly?: boolean;
}

export interface MemoryGovernanceDiagnosticsSummary {
  totalRecords: number;
  visibleRecords: number;
  quarantinedRecords: number;
  pendingReviewRecords: number;
  approvalRequiredWrites: number;
  rejectedRecords: number;
}
