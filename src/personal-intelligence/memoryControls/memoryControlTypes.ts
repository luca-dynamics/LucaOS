import type { LucaExperienceMode } from "../../experience/experienceMode";
import type {
  PersonalMemoryCategory,
  PersonalMemoryConfidence,
  PersonalMemoryGraph,
  PersonalMemoryJsonValue,
  PersonalMemoryNode,
  PersonalMemorySensitivity,
  PersonalMemorySource,
  PersonalMemoryStaleness,
} from "../memoryGraph";

export type PersonalMemoryControlAction =
  | "approve_memory"
  | "deny_memory"
  | "forget_memory"
  | "correct_memory"
  | "edit_memory"
  | "make_temporary"
  | "make_private"
  | "mark_do_not_sync"
  | "mark_sync_allowed"
  | "archive_memory"
  | "restore_memory";

export type PersonalMemoryControlDecision =
  | "allowed"
  | "approval_required"
  | "blocked"
  | "unsupported"
  | "review_only";

export type PersonalMemoryControlRisk = "low" | "medium" | "high" | "sensitive";

export type PersonalMemoryControlReason =
  | "action_available"
  | "pending_memory_can_be_approved"
  | "pending_memory_can_be_denied"
  | "memory_can_be_forgotten"
  | "sensitive_change_requires_review"
  | "private_change_requires_review"
  | "expiration_required"
  | "invalid_expiration"
  | "sensitive_memory_cannot_sync"
  | "inactive_memory_requires_restore"
  | "restore_requires_review"
  | "already_in_requested_state"
  | "target_not_found"
  | "missing_changes"
  | "unsupported_action";

export interface PersonalMemoryControlChanges {
  readonly title?: string;
  readonly summary?: string;
  readonly value?: PersonalMemoryJsonValue;
  readonly expiresAt?: string;
}

export interface PersonalMemoryControlRequest {
  readonly targetMemoryId: string;
  readonly action: PersonalMemoryControlAction;
  readonly changes?: PersonalMemoryControlChanges;
  readonly expiresAt?: string;
  readonly requestedBy?: "user" | "system_preview";
  readonly reason?: string;
}

export interface PersonalMemoryControlOptions {
  readonly now?: Date;
  readonly mode?: LucaExperienceMode;
}

export interface PersonalMemoryControlStateSummary {
  readonly lifecycle: PersonalMemoryNode["lifecycle"];
  readonly approvalState: PersonalMemoryNode["approvalState"];
  readonly sensitivity: PersonalMemorySensitivity;
  readonly localOnly: boolean;
  readonly allowSync: boolean;
  readonly expiresAt?: string;
  readonly titleChanged: boolean;
  readonly summaryChanged: boolean;
  readonly valueChanged: boolean;
}

export interface PersonalMemoryControlEvaluation {
  readonly decision: PersonalMemoryControlDecision;
  readonly reason: PersonalMemoryControlReason;
  readonly risk: PersonalMemoryControlRisk;
  readonly warnings: readonly string[];
}

export interface PersonalMemoryControlPreview extends PersonalMemoryControlEvaluation {
  readonly targetMemoryId: string;
  readonly action: PersonalMemoryControlAction;
  readonly currentStateSummary: PersonalMemoryControlStateSummary | null;
  readonly proposedStateSummary: PersonalMemoryControlStateSummary | null;
  readonly proposedNode: PersonalMemoryNode | null;
  readonly summary: string;
  readonly sideEffectsPerformed: false;
}

export type PersonalMemoryControlResult = PersonalMemoryControlPreview;

export type PersonalMemoryReviewReason =
  | "pending_approval"
  | "requires_review"
  | "stale_important"
  | "conflict"
  | "sync_risk"
  | "sensitive_confirmation"
  | "temporary_near_expiration"
  | "temporary_expired";

export interface PersonalMemoryReviewAuditMetadata {
  readonly source: PersonalMemorySource;
  readonly confidence: PersonalMemoryConfidence;
  readonly evidenceIds: readonly string[];
  readonly evidenceCount: number;
  readonly edgeIds: readonly string[];
}

export interface PersonalMemoryControlReviewItem {
  readonly memoryId: string;
  readonly title: string;
  readonly detail: string;
  readonly category?: PersonalMemoryCategory;
  readonly sensitivity?: PersonalMemorySensitivity;
  readonly staleness?: PersonalMemoryStaleness;
  readonly reasons: readonly PersonalMemoryReviewReason[];
  readonly suggestedActions: readonly PersonalMemoryControlAction[];
  readonly redacted: boolean;
  readonly audit?: PersonalMemoryReviewAuditMetadata;
}

export interface PersonalMemoryControlReviewQueue {
  readonly graphId: PersonalMemoryGraph["graphId"];
  readonly mode: LucaExperienceMode;
  readonly items: readonly PersonalMemoryControlReviewItem[];
  readonly generatedAt: string;
  readonly sideEffectsPerformed: false;
}
