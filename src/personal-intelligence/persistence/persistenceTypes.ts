import type { LearningLogEntry } from "../learning/learningTypes";
import type { MemoryItem } from "../memory/memoryTypes";
import type { PrivacyZone } from "../privacy/privacyZones";

export type PersistenceProposalKind = "memory" | "learning";
export type PersistenceProposalStatus =
  | "draft"
  | "review_required"
  | "approved_for_future_adapter"
  | "rejected"
  | "cancelled";
export type PersistenceRequestedOperation =
  | "create"
  | "update"
  | "delete"
  | "retain"
  | "export";
export type PersistencePreviewFormat = "json" | "markdown" | "text";

export interface PersistenceApprovalMetadata {
  approvedBy: "user";
  approvedAt: string;
  approvalNote?: string;
  explicitUserApproval: true;
}

interface PersistenceProposalBase {
  proposalId: string;
  kind: PersistenceProposalKind;
  title: string;
  summary: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  privacyZone: PrivacyZone;
  confidence: number;
  status: PersistenceProposalStatus;
  requestedOperation: PersistenceRequestedOperation;
  targetRef?: string;
  serializedPreview?: string;
  approvalRequired: boolean;
  explicitUserApprovalRequired: boolean;
  approvalMetadata?: PersistenceApprovalMetadata;
  blockers: string[];
  warnings: string[];
  auditRefs: string[];
  writePerformed: false;
}

export interface MemoryPersistenceProposal extends PersistenceProposalBase {
  kind: "memory";
  memoryItem: MemoryItem;
  proposedPath: string;
  serializedContentPreview: string;
  format: PersistencePreviewFormat;
}

export interface LearningPersistenceProposal extends PersistenceProposalBase {
  kind: "learning";
  learningEvent: LearningLogEntry;
  relatedMissionId?: string;
  relatedMemoryItemIds?: string[];
}

export type PersonalIntelligencePersistenceProposal =
  | MemoryPersistenceProposal
  | LearningPersistenceProposal;

export interface PersistenceProposalValidationResult {
  valid: boolean;
  errors: string[];
  blockers: string[];
  warnings: string[];
}

export interface PersistenceProposalOptions {
  proposalId: string;
  title?: string;
  summary?: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
  privacyZone?: PrivacyZone;
  confidence?: number;
  status?: "draft" | "review_required";
  requestedOperation?: PersistenceRequestedOperation;
  targetRef?: string;
  serializedPreview?: string;
  blockers?: string[];
  warnings?: string[];
  auditRefs?: string[];
  now?: () => Date;
}

export interface MemoryPersistenceProposalOptions extends PersistenceProposalOptions {
  proposedPath: string;
  serializedContentPreview?: string;
  format?: PersistencePreviewFormat;
}

export interface LearningPersistenceProposalOptions extends PersistenceProposalOptions {
  relatedMissionId?: string;
  relatedMemoryItemIds?: string[];
}
