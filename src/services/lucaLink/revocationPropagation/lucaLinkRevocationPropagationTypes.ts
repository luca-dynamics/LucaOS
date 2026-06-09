import type {
  LucaLinkLinkedHostConnectionState,
  LucaLinkPermissionId,
} from "../lucaLinkLinkedHostRegistry";
import type { LucaLinkApprovalState } from "../governance";
import type {
  LucaLinkHandoffLane,
  LucaLinkSessionHost,
  LucaLinkSessionLane,
  LucaLinkSessionOwner,
} from "../sessionOwnership";

export type LucaLinkRevocationPropagationStatus = "revoked" | "blocked";

export type LucaLinkRevocationPropagationReason =
  | "host_revoked"
  | "host_blocked"
  | "revoked_host_owns_lane"
  | "blocked_host_owns_lane"
  | "primary_host_review_required"
  | "handoff_source_invalid"
  | "handoff_target_invalid"
  | "handoff_approval_owner_invalid"
  | "runtime_not_enabled"
  | "approval_involves_invalid_host"
  | "permission_invalidated"
  | "future_runtime_cleanup_required";

export type LucaLinkRevocationLaneDisposition =
  | "invalidate"
  | "invalidate_and_review"
  | "primary_host_review"
  | "runtime_disabled";

export interface LucaLinkRevocationOwnershipAssignment {
  lane: LucaLinkSessionLane;
  owner?: LucaLinkSessionOwner;
}

export interface LucaLinkRevocationAffectedLane {
  lane: LucaLinkSessionLane;
  previousOwnerHostId: string;
  disposition: LucaLinkRevocationLaneDisposition;
  reason: LucaLinkRevocationPropagationReason;
  suggestedFallbackHostId?: string;
  reassignmentPerformed: false;
}

export type LucaLinkPendingHandoffState = "pending" | "awaiting_approval";

export interface LucaLinkPendingHandoff {
  handoffId: string;
  sessionId: string;
  fromHostId: string;
  toHostId: string;
  lane: LucaLinkHandoffLane;
  approvalOwnerHostId?: string;
  state: LucaLinkPendingHandoffState;
}

export type LucaLinkRevocationHandoffDisposition =
  | "cancelled"
  | "blocked"
  | "requires_review"
  | "not_affected";

export interface LucaLinkRevocationCancelledHandoff {
  handoffId: string;
  lane: LucaLinkHandoffLane;
  disposition: LucaLinkRevocationHandoffDisposition;
  reason: LucaLinkRevocationPropagationReason;
  primaryHostReviewRequired: boolean;
  stateMutationPerformed: false;
}

export interface LucaLinkRevocationApprovalRecord {
  approvalId: string;
  requestedByHostId: string;
  targetHostId?: string;
  approvalOwnerHostId: string;
  state: LucaLinkApprovalState;
  permission?: LucaLinkPermissionId;
}

export type LucaLinkRevocationApprovalDisposition =
  | "revoked"
  | "cancelled"
  | "requires_review";

export interface LucaLinkRevocationStaleApproval {
  approvalId: string;
  previousState: LucaLinkApprovalState;
  disposition: LucaLinkRevocationApprovalDisposition;
  reason: LucaLinkRevocationPropagationReason;
  primaryHostReviewRequired: boolean;
  stateMutationPerformed: false;
}

export type LucaLinkRevocationBlockedPermissionState =
  | "blocked"
  | "runtime_disabled";

export interface LucaLinkRevocationBlockedPermission {
  permission: LucaLinkPermissionId;
  state: LucaLinkRevocationBlockedPermissionState;
  reason: LucaLinkRevocationPropagationReason;
}

export type LucaLinkRevocationAdapterActionType =
  | "disconnect_transport"
  | "stop_voice_relay"
  | "stop_display_session"
  | "cancel_file_exchange"
  | "cancel_pending_handoff"
  | "clear_memory_context"
  | "invalidate_tool_execution_candidate"
  | "record_audit_event";

export type LucaLinkRevocationSeverity = "info" | "warning" | "critical";

export interface LucaLinkRevocationAdapterAction {
  action: LucaLinkRevocationAdapterActionType;
  targetHostId: string;
  reason: LucaLinkRevocationPropagationReason;
  severity: LucaLinkRevocationSeverity;
  dryRunOnly: true;
}

export interface LucaLinkRevocationAuditEvent {
  eventType: "lucalink_host_revocation_propagation_required";
  hostId: string;
  hostState: LucaLinkRevocationPropagationStatus;
  severity: "warning" | "critical";
  message: string;
  dryRunOnly: true;
  recorded: false;
}

export interface LucaLinkRevocationDeviceCenterState {
  hostId: string;
  connectionState: Extract<
    LucaLinkLinkedHostConnectionState,
    "revoked" | "blocked"
  >;
  label: "Revoked" | "Blocked";
  activeOwnershipInvalid: boolean;
  reviewRequired: boolean;
  runtimeActionExecuted: false;
}

export interface LucaLinkRevocationPropagationInput {
  host: LucaLinkSessionHost;
  primaryHost?: LucaLinkSessionHost;
  generatedAt: string;
  ownershipAssignments: readonly LucaLinkRevocationOwnershipAssignment[];
  pendingHandoffs?: readonly LucaLinkPendingHandoff[];
  approvals?: readonly LucaLinkRevocationApprovalRecord[];
}

export interface LucaLinkRevocationPropagationPlan {
  hostId: string;
  hostState: LucaLinkRevocationPropagationStatus;
  generatedAt: string;
  affectedLanes: LucaLinkRevocationAffectedLane[];
  cancelledHandoffs: LucaLinkRevocationCancelledHandoff[];
  staleApprovals: LucaLinkRevocationStaleApproval[];
  blockedPermissions: LucaLinkRevocationBlockedPermission[];
  adapterActions: LucaLinkRevocationAdapterAction[];
  auditEvents: LucaLinkRevocationAuditEvent[];
  deviceCenterState: LucaLinkRevocationDeviceCenterState;
  operationCenterSummary: string;
  deviceCenterSummary: string;
  requiresUserReview: boolean;
  sideEffectsPerformed: false;
  dryRunOnly: true;
}

export type LucaLinkRevocationDryRunResult = LucaLinkRevocationPropagationPlan;
