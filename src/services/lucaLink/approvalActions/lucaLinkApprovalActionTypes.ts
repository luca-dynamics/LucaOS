import type { LucaExperienceMode } from "../../../experience/experienceMode";
import type {
  LucaLinkLinkedHostConnectionState,
  LucaLinkLinkedHostRecord,
  LucaLinkLinkedHostTrustState,
  LucaLinkPermissionId,
} from "../lucaLinkLinkedHostRegistry";
import type {
  LucaLinkGovernanceEvaluation,
} from "../governance";
import type {
  LucaLinkHandoffLane,
  LucaLinkHandoffReadiness,
  LucaLinkHandoffReadinessReason,
  LucaLinkSessionHost,
  LucaLinkSessionOwnershipState,
} from "../sessionOwnership";
import type {
  LucaLinkPendingHandoff,
  LucaLinkRevocationPropagationInput,
  LucaLinkRevocationPropagationPlan,
} from "../revocationPropagation";

export type LucaLinkApprovalAction =
  | "approve_host"
  | "deny_host"
  | "revoke_host"
  | "block_host"
  | "review_handoff"
  | "cancel_handoff";

export type LucaLinkApprovalActionDecision =
  | "allowed"
  | "approval_required"
  | "blocked"
  | "review_only"
  | "unsupported";

export type LucaLinkApprovalActionRisk = "low" | "medium" | "high" | "critical";

export interface LucaLinkApprovalActionStatePreview {
  connectionState: LucaLinkLinkedHostConnectionState;
  trustState: LucaLinkLinkedHostTrustState;
  blockedPermissions: LucaLinkPermissionId[];
  approvalRequiredPermissions: LucaLinkPermissionId[];
}

export interface LucaLinkApprovalActionPreview {
  hostId: string;
  displayHostId?: string;
  action: LucaLinkApprovalAction;
  currentState: LucaLinkApprovalActionStatePreview;
  proposedState: LucaLinkApprovalActionStatePreview;
  decision: LucaLinkApprovalActionDecision;
  reason: string;
  risk: LucaLinkApprovalActionRisk;
  warnings: string[];
  requiresConfirmation: boolean;
  requiresPrimaryHostReview: boolean;
  sideEffectsPerformed: false;
  previewOnly: true;
  runtimeDisabled: boolean;
  revocationDryRun?: LucaLinkRevocationPropagationPlan;
  handoffReview?: LucaLinkHandoffReviewSummary;
}

export interface LucaLinkApprovalActionInput {
  host: LucaLinkLinkedHostRecord;
  action: LucaLinkApprovalAction;
  generatedAt?: string;
  primaryHost?: LucaLinkSessionHost;
  sessionHost?: LucaLinkSessionHost;
  revocationInput?: Omit<LucaLinkRevocationPropagationInput, "host" | "generatedAt">;
  handoff?: LucaLinkHandoffReviewInput;
}

export interface LucaLinkHandoffReviewInput {
  handoffId: string;
  fromHost: LucaLinkSessionHost;
  toHost: LucaLinkSessionHost;
  lane: LucaLinkHandoffLane;
  approvalOwnerHostId?: string;
  governanceDecision: LucaLinkGovernanceEvaluation;
  sessionOwnershipState: LucaLinkSessionOwnershipState;
  pendingHandoff?: LucaLinkPendingHandoff;
}

export interface LucaLinkHandoffReviewSummary {
  handoffId: string;
  fromHostId: string;
  toHostId: string;
  lane: LucaLinkHandoffLane;
  readiness: LucaLinkHandoffReadiness;
  reason?: LucaLinkHandoffReadinessReason | "primary_host_review_required" | "runtime_disabled" | "cancel_preview_only";
  requiresPrimaryHostReview: boolean;
  runtimeDisabled: boolean;
  sideEffectsPerformed: false;
  previewOnly: true;
}

export interface LucaLinkApprovalOperationCenterSummary {
  title: string;
  actionPreview: LucaLinkApprovalAction;
  affectedLanes: number;
  blockedPermissions: number;
  runtimeExecution: "disabled";
  sideEffects: "none";
  primaryHostReview: "required" | "not_required";
  previewOnly: true;
}

export interface LucaLinkApprovalActionDisclosureSummary {
  mode: LucaExperienceMode;
  title: string;
  simpleStatus: string;
  explanation: string;
  sensitiveAccessCopy: string;
  runtimeCopy: string;
  counts?: {
    affectedLanes?: number;
    staleApprovals?: number;
    blockedPermissions?: number;
    adapterActions?: number;
  };
  diagnosticHostId?: string;
  affectedLanes?: string[];
  dryRunAdapterActions?: string[];
  auditEventPreview?: string[];
  modelFlags?: string[];
}
