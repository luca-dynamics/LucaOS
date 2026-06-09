import type { LucaExperienceMode } from "../../experience/experienceMode";
import type {
  PersonalMemoryConfidence,
  PersonalMemoryEdgeType,
  PersonalMemorySource,
  PersonalMemoryStaleness,
} from "../memoryGraph";

export interface ContinuityRelationshipEvidence {
  readonly edgeId: string;
  readonly type: PersonalMemoryEdgeType;
  readonly relatedNodeId: string;
  readonly reason?: string;
}

export interface ContinuityAuditMetadata {
  readonly source: PersonalMemorySource;
  readonly confidence: PersonalMemoryConfidence;
  readonly staleness: PersonalMemoryStaleness;
  readonly relationshipEvidence: readonly ContinuityRelationshipEvidence[];
  readonly reasoningFlags: readonly string[];
}

export interface ContinuityProjectSummary {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly score: number;
  readonly goalTitles: readonly string[];
  readonly openTaskCount: number;
  readonly audit?: ContinuityAuditMetadata;
}

export interface ContinuityTaskSummary {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly score: number;
  readonly projectId?: string;
  readonly blocked: boolean;
  readonly dependencyTitles: readonly string[];
  readonly audit?: ContinuityAuditMetadata;
}

export interface ContinuityDecisionSummary {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly score: number;
  readonly projectId?: string;
  readonly audit?: ContinuityAuditMetadata;
}

export type ContinuityBlockerKind = "blocked_task" | "dependency" | "conflict";

export interface ContinuityBlockerSummary {
  readonly id: string;
  readonly kind: ContinuityBlockerKind;
  readonly title: string;
  readonly summary: string;
  readonly relatedMemoryIds: readonly string[];
  readonly audit?: ContinuityAuditMetadata;
}

export interface ContinuityNextAction {
  readonly id: string;
  readonly title: string;
  readonly rationale: string;
  readonly priority: number;
  readonly taskId?: string;
  readonly projectId?: string;
  readonly blocked: boolean;
  readonly audit?: ContinuityAuditMetadata;
}

export interface ContinuityHandoffSummary {
  readonly headline: string;
  readonly detail: string;
  readonly restoredContext: readonly string[];
}

export type ContinuityWarningKind = "stale_context" | "privacy_review";

export interface ContinuityWarning {
  readonly id: string;
  readonly kind: ContinuityWarningKind;
  readonly message: string;
  readonly relatedMemoryId?: string;
  readonly audit?: ContinuityAuditMetadata;
}

export interface PersonalContinuitySnapshot {
  readonly graphId: string;
  readonly mode: LucaExperienceMode;
  readonly activeProject: ContinuityProjectSummary | null;
  readonly openTasks: readonly ContinuityTaskSummary[];
  readonly recentDecisions: readonly ContinuityDecisionSummary[];
  readonly blockers: readonly ContinuityBlockerSummary[];
  readonly recommendedNextActions: readonly ContinuityNextAction[];
  readonly handoffSummary: ContinuityHandoffSummary;
  readonly staleContextWarnings: readonly ContinuityWarning[];
  readonly privacyWarnings: readonly ContinuityWarning[];
  readonly generatedAt: string;
  readonly sideEffectsPerformed: false;
}

export interface CreateContinuitySnapshotOptions {
  readonly mode?: LucaExperienceMode;
  readonly now?: Date;
  readonly maxItems?: number;
}
