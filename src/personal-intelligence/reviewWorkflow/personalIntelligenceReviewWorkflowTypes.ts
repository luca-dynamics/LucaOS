import type { LucaExperienceMode } from "../../experience/experienceMode";
import type {
  PersonalMemoryControlAction,
  PersonalMemoryControlDecision,
  PersonalMemoryControlReason,
  PersonalMemoryControlReviewItem,
  PersonalMemoryControlReviewQueue,
  PersonalMemoryControlStateSummary,
} from "../memoryControls";
import type { PersonalMemoryGraph } from "../memoryGraph";

export type PersonalIntelligenceReviewWorkflowPhase =
  | "idle"
  | "selected"
  | "preview_ready"
  | "confirmation_required"
  | "confirmed"
  | "cancelled"
  | "blocked"
  | "review_only";

export type PersonalIntelligenceReviewWorkflowDecision =
  | PersonalMemoryControlDecision
  | "confirmed_intent"
  | "cancelled_intent";

export type PersonalIntelligenceReviewWorkflowReason =
  | PersonalMemoryControlReason
  | "workflow_ready"
  | "item_selected"
  | "confirmation_recorded"
  | "preview_cancelled";

export interface PersonalIntelligenceReviewWorkflowItem {
  readonly memoryId: string;
  readonly displayId?: string;
  readonly title: string;
  readonly detail: string;
  readonly reasons: PersonalMemoryControlReviewItem["reasons"];
  readonly suggestedActions: readonly PersonalMemoryControlAction[];
  readonly category?: PersonalMemoryControlReviewItem["category"];
  readonly sensitivity?: PersonalMemoryControlReviewItem["sensitivity"];
  readonly staleness?: PersonalMemoryControlReviewItem["staleness"];
  readonly reasonCount?: number;
  readonly redacted: boolean;
  readonly audit?: PersonalMemoryControlReviewItem["audit"] & {
    readonly safeMemoryId: string;
  };
}

export interface PersonalIntelligenceReviewSelection {
  readonly workflowId: string;
  readonly targetMemoryId: string;
  readonly item: PersonalIntelligenceReviewWorkflowItem;
  readonly selectedAction?: PersonalMemoryControlAction;
  readonly mode: LucaExperienceMode;
  readonly sideEffectsPerformed: false;
  readonly persistencePerformed: false;
}

export interface PersonalIntelligenceReviewPreviewState {
  readonly workflowId: string;
  readonly targetMemoryId: string;
  readonly displayTargetMemoryId?: string;
  readonly action: PersonalMemoryControlAction;
  readonly currentStateSummary: PersonalMemoryControlStateSummary | null;
  readonly proposedStateSummary: PersonalMemoryControlStateSummary | null;
  readonly summary: string;
  readonly warnings: readonly string[];
  readonly decision: PersonalMemoryControlDecision;
  readonly reason: PersonalMemoryControlReason;
  readonly requiresConfirmation: boolean;
  readonly requiresUserReview: boolean;
  readonly mode: LucaExperienceMode;
  readonly sideEffectsPerformed: false;
  readonly persistencePerformed: false;
}

export interface PersonalIntelligenceReviewEvent {
  readonly workflowId: string;
  readonly targetMemoryId: string;
  readonly action?: PersonalMemoryControlAction;
  readonly phase: PersonalIntelligenceReviewWorkflowPhase;
  readonly decision: PersonalIntelligenceReviewWorkflowDecision;
  readonly reason: PersonalIntelligenceReviewWorkflowReason;
  readonly summary: string;
  readonly sideEffectsPerformed: false;
  readonly persistencePerformed: false;
  readonly mutationPerformed: false;
}

export interface PersonalIntelligenceReviewConfirmation {
  readonly workflowId: string;
  readonly targetMemoryId: string;
  readonly action: PersonalMemoryControlAction;
  readonly confirmed: boolean;
  readonly preview: PersonalIntelligenceReviewPreviewState;
  readonly event: PersonalIntelligenceReviewEvent;
  readonly sideEffectsPerformed: false;
  readonly persistencePerformed: false;
  readonly mutationPerformed: false;
}

export interface PersonalIntelligenceReviewResult {
  readonly workflowId: string;
  readonly targetMemoryId: string;
  readonly action?: PersonalMemoryControlAction;
  readonly phase: PersonalIntelligenceReviewWorkflowPhase;
  readonly preview: PersonalIntelligenceReviewPreviewState | null;
  readonly decision: PersonalIntelligenceReviewWorkflowDecision;
  readonly reason: PersonalIntelligenceReviewWorkflowReason;
  readonly requiresConfirmation: boolean;
  readonly requiresUserReview: boolean;
  readonly mode: LucaExperienceMode;
  readonly eventSummary: string;
  readonly confirmed?: boolean;
  readonly sideEffectsPerformed: false;
  readonly persistencePerformed: false;
  readonly mutationPerformed: false;
}

export interface PersonalIntelligenceReviewWorkflowState {
  readonly workflowId: string;
  readonly graphId: PersonalMemoryGraph["graphId"];
  readonly mode: LucaExperienceMode;
  readonly phase: PersonalIntelligenceReviewWorkflowPhase;
  readonly queue: PersonalMemoryControlReviewQueue;
  readonly items: readonly PersonalIntelligenceReviewWorkflowItem[];
  readonly selection: PersonalIntelligenceReviewSelection | null;
  readonly preview: PersonalIntelligenceReviewPreviewState | null;
  readonly result: PersonalIntelligenceReviewResult | null;
  readonly eventSummary: string;
  readonly generatedAt: string;
  readonly sideEffectsPerformed: false;
  readonly persistencePerformed: false;
  readonly mutationPerformed: false;
}
