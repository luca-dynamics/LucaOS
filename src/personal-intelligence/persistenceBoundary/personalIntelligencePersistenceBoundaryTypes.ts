import type { LucaExperienceMode } from "../../experience/experienceMode";
import type {
  PersonalMemoryControlAction,
  PersonalMemoryControlPreview,
  PersonalMemoryControlRisk,
  PersonalMemoryControlStateSummary,
} from "../memoryControls";
import type {
  PersonalIntelligenceReviewResult,
  PersonalIntelligenceReviewWorkflowState,
} from "../reviewWorkflow";

export type PersonalIntelligencePersistenceDecision =
  | "eligible"
  | "requires_review"
  | "blocked"
  | "rejected"
  | "dry_run_only";

export type PersonalIntelligencePersistenceRequestSource =
  | "review_workflow_confirmation"
  | "memory_control_preview"
  | "system_migration"
  | "manual_import";

export type PersonalIntelligencePersistenceRisk = PersonalMemoryControlRisk | "critical";

export type PersonalIntelligencePersistenceAuditEventType =
  | "personal_intelligence_persistence_candidate_created"
  | "personal_intelligence_persistence_blocked"
  | "personal_intelligence_persistence_requires_review"
  | "personal_intelligence_persistence_dry_run_confirmed";

export interface PersonalIntelligencePersistenceImpact {
  readonly level: "none" | "low" | "medium" | "high";
  readonly summary: string;
  readonly protected: boolean;
}

export interface PersonalIntelligencePersistenceCandidate {
  readonly requestId: string;
  readonly source: PersonalIntelligencePersistenceRequestSource;
  readonly targetMemoryId: string;
  readonly displayTargetMemoryId?: string;
  readonly action: PersonalMemoryControlAction;
  readonly confirmed: boolean;
  readonly mode: LucaExperienceMode;
  readonly preview: Pick<
    PersonalMemoryControlPreview,
    | "decision"
    | "reason"
    | "risk"
    | "warnings"
    | "currentStateSummary"
    | "proposedStateSummary"
    | "sideEffectsPerformed"
  >;
  readonly reviewResult?: PersonalIntelligenceReviewResult;
  readonly workflowState?: PersonalIntelligenceReviewWorkflowState;
  readonly createdAt: string;
  readonly dryRunOnly: true;
}

export interface PersonalIntelligencePersistenceRequest {
  readonly requestId: string;
  readonly source: PersonalIntelligencePersistenceRequestSource;
  readonly targetMemoryId: string;
  readonly action: PersonalMemoryControlAction;
  readonly candidate: PersonalIntelligencePersistenceCandidate;
  readonly requiresExplicitUserConfirmation: boolean;
  readonly requiresAuditBeforeWrite: boolean;
  readonly dryRunOnly: true;
}

export interface PersonalIntelligencePersistencePlan {
  readonly requestId: string;
  readonly action: PersonalMemoryControlAction;
  readonly decision: PersonalIntelligencePersistenceDecision;
  readonly eligibleForFuturePersistence: boolean;
  readonly blockedActions: readonly string[];
  readonly deferredActions: readonly string[];
  readonly dryRunOnly: true;
  readonly persistencePerformed: false;
  readonly mutationPerformed: false;
  readonly sideEffectsPerformed: false;
}

export interface PersonalIntelligenceRollbackPlan {
  readonly rollbackPlanId: string;
  readonly targetMemoryId: string;
  readonly action: PersonalMemoryControlAction;
  readonly previousStateSummary: PersonalMemoryControlStateSummary | null;
  readonly proposedStateSummary: PersonalMemoryControlStateSummary | null;
  readonly rollbackAction: string;
  readonly requiresUserConfirmation: boolean;
  readonly available: boolean;
  readonly reason: string;
  readonly dryRunOnly: true;
  readonly executed: false;
}

export interface PersonalIntelligencePersistenceAuditEvent {
  readonly eventId: string;
  readonly eventType: PersonalIntelligencePersistenceAuditEventType;
  readonly requestId: string;
  readonly targetMemoryId: string;
  readonly action: PersonalMemoryControlAction;
  readonly decision: PersonalIntelligencePersistenceDecision;
  readonly risk: PersonalIntelligencePersistenceRisk;
  readonly reason: string;
  readonly source: PersonalIntelligencePersistenceRequestSource;
  readonly createdAt: string;
  readonly requiresUserConfirmation: boolean;
  readonly requiresAuditBeforeWrite: boolean;
  readonly privacyImpact: PersonalIntelligencePersistenceImpact;
  readonly syncImpact: PersonalIntelligencePersistenceImpact;
  readonly rollbackPlanId: string;
  readonly recorded: false;
  readonly dryRunOnly: true;
}

export interface PersonalIntelligencePersistenceRejection {
  readonly code:
    | "unconfirmed_review_result"
    | "cancelled_review_result"
    | "blocked_preview"
    | "unsupported_source"
    | "sync_restricted"
    | "review_result_missing_preview"
    | "missing_action";
  readonly reason: string;
}

export interface PersonalIntelligencePersistenceBoundaryResult {
  readonly requestId: string;
  readonly source: PersonalIntelligencePersistenceRequestSource;
  readonly targetMemoryId: string;
  readonly displayTargetMemoryId?: string;
  readonly action: PersonalMemoryControlAction;
  readonly decision: PersonalIntelligencePersistenceDecision;
  readonly reason: string;
  readonly risk: PersonalIntelligencePersistenceRisk;
  readonly auditEvent: PersonalIntelligencePersistenceAuditEvent;
  readonly rollbackPlan: PersonalIntelligenceRollbackPlan;
  readonly privacyImpact: PersonalIntelligencePersistenceImpact;
  readonly syncImpact: PersonalIntelligencePersistenceImpact;
  readonly rejection?: PersonalIntelligencePersistenceRejection;
  readonly plan: PersonalIntelligencePersistencePlan;
  readonly requiresExplicitUserConfirmation: boolean;
  readonly requiresAuditBeforeWrite: boolean;
  readonly eligibleForFuturePersistence: boolean;
  readonly dryRunOnly: true;
  readonly sideEffectsPerformed: false;
  readonly persistencePerformed: false;
  readonly mutationPerformed: false;
}
