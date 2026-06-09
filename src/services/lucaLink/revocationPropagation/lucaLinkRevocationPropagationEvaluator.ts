import {
  createRevocationBlockedPermissions,
  getAffectedLaneDisposition,
  getRevocationTerminalReason,
} from "./lucaLinkRevocationPropagationPolicy";
import type {
  LucaLinkPendingHandoff,
  LucaLinkRevocationAdapterAction,
  LucaLinkRevocationAffectedLane,
  LucaLinkRevocationApprovalRecord,
  LucaLinkRevocationCancelledHandoff,
  LucaLinkRevocationPropagationInput,
  LucaLinkRevocationPropagationPlan,
  LucaLinkRevocationPropagationStatus,
  LucaLinkRevocationStaleApproval,
} from "./lucaLinkRevocationPropagationTypes";

function getHostStatus(
  input: LucaLinkRevocationPropagationInput,
): LucaLinkRevocationPropagationStatus {
  if (
    input.host.connectionState === "blocked" ||
    input.host.role === "blocked"
  ) {
    return "blocked";
  }
  return "revoked";
}

function evaluateAffectedLanes(
  input: LucaLinkRevocationPropagationInput,
  hostState: LucaLinkRevocationPropagationStatus,
): LucaLinkRevocationAffectedLane[] {
  return input.ownershipAssignments.flatMap((assignment) => {
    if (assignment.owner?.hostId !== input.host.hostId) return [];

    const approvalFallback =
      assignment.lane === "approval_owner" &&
      input.primaryHost?.role === "primary_host" &&
      input.primaryHost.connectionState !== "revoked" &&
      input.primaryHost.connectionState !== "blocked" &&
      input.primaryHost.hostId !== input.host.hostId
        ? input.primaryHost.hostId
        : undefined;

    return [
      {
        lane: assignment.lane,
        previousOwnerHostId: input.host.hostId,
        disposition: getAffectedLaneDisposition(assignment.lane),
        reason:
          assignment.lane === "approval_owner"
            ? "primary_host_review_required"
            : hostState === "blocked"
              ? "blocked_host_owns_lane"
              : "revoked_host_owns_lane",
        ...(approvalFallback
          ? { suggestedFallbackHostId: approvalFallback }
          : {}),
        reassignmentPerformed: false,
      },
    ];
  });
}

export function classifyRevocationPendingHandoff(
  handoff: LucaLinkPendingHandoff,
  revokedHostId: string,
): LucaLinkRevocationCancelledHandoff {
  const base = {
    handoffId: handoff.handoffId,
    lane: handoff.lane,
    stateMutationPerformed: false,
  } as const;

  if (
    handoff.lane === "remote_action" ||
    handoff.lane === "tool_execution_owner"
  ) {
    return {
      ...base,
      disposition: "blocked",
      reason: "runtime_not_enabled",
      primaryHostReviewRequired: false,
    };
  }
  if (handoff.fromHostId === revokedHostId) {
    return {
      ...base,
      disposition: "cancelled",
      reason: "handoff_source_invalid",
      primaryHostReviewRequired: false,
    };
  }
  if (handoff.toHostId === revokedHostId) {
    return {
      ...base,
      disposition: "blocked",
      reason: "handoff_target_invalid",
      primaryHostReviewRequired: false,
    };
  }
  if (handoff.approvalOwnerHostId === revokedHostId) {
    return {
      ...base,
      disposition: "requires_review",
      reason: "handoff_approval_owner_invalid",
      primaryHostReviewRequired: true,
    };
  }
  return {
    ...base,
    disposition: "not_affected",
    reason: "future_runtime_cleanup_required",
    primaryHostReviewRequired: false,
  };
}

function evaluateApprovals(
  approvals: readonly LucaLinkRevocationApprovalRecord[],
  hostId: string,
): LucaLinkRevocationStaleApproval[] {
  return approvals.flatMap((approval) => {
    const involvesHost =
      approval.requestedByHostId === hostId ||
      approval.targetHostId === hostId ||
      approval.approvalOwnerHostId === hostId;
    if (!involvesHost) return [];

    const approvalOwnerInvalid = approval.approvalOwnerHostId === hostId;
    return [
      {
        approvalId: approval.approvalId,
        previousState: approval.state,
        disposition: approvalOwnerInvalid
          ? "requires_review"
          : approval.state === "pending"
            ? "cancelled"
            : "revoked",
        reason: approvalOwnerInvalid
          ? "primary_host_review_required"
          : "approval_involves_invalid_host",
        primaryHostReviewRequired: approvalOwnerInvalid,
        stateMutationPerformed: false,
      },
    ];
  });
}

function createAdapterActions(
  hostId: string,
  hostState: LucaLinkRevocationPropagationStatus,
  handoffs: readonly LucaLinkRevocationCancelledHandoff[],
): LucaLinkRevocationAdapterAction[] {
  const terminalReason = getRevocationTerminalReason(hostState);
  const requiresHandoffCancellation = handoffs.some(
    (handoff) => handoff.disposition !== "not_affected",
  );

  return [
    {
      action: "disconnect_transport",
      targetHostId: hostId,
      reason: terminalReason,
      severity: "critical",
      dryRunOnly: true,
    },
    {
      action: "stop_voice_relay",
      targetHostId: hostId,
      reason: "permission_invalidated",
      severity: "critical",
      dryRunOnly: true,
    },
    {
      action: "stop_display_session",
      targetHostId: hostId,
      reason: "permission_invalidated",
      severity: "critical",
      dryRunOnly: true,
    },
    {
      action: "cancel_file_exchange",
      targetHostId: hostId,
      reason: "permission_invalidated",
      severity: "critical",
      dryRunOnly: true,
    },
    ...(requiresHandoffCancellation
      ? [
          {
            action: "cancel_pending_handoff" as const,
            targetHostId: hostId,
            reason: "future_runtime_cleanup_required" as const,
            severity: "critical" as const,
            dryRunOnly: true as const,
          },
        ]
      : []),
    {
      action: "clear_memory_context",
      targetHostId: hostId,
      reason: "permission_invalidated",
      severity: "critical",
      dryRunOnly: true,
    },
    {
      action: "invalidate_tool_execution_candidate",
      targetHostId: hostId,
      reason: "runtime_not_enabled",
      severity: "critical",
      dryRunOnly: true,
    },
    {
      action: "record_audit_event",
      targetHostId: hostId,
      reason: "future_runtime_cleanup_required",
      severity: "warning",
      dryRunOnly: true,
    },
  ];
}

type SummaryInput = Pick<
  LucaLinkRevocationPropagationPlan,
  | "hostId"
  | "hostState"
  | "affectedLanes"
  | "cancelledHandoffs"
  | "staleApprovals"
  | "adapterActions"
>;

export function createRevocationOperationSummary(plan: SummaryInput): string {
  const affectedHandoffs = plan.cancelledHandoffs.filter(
    (handoff) => handoff.disposition !== "not_affected",
  ).length;
  return `LucaLink host ${plan.hostId} is ${plan.hostState}. ${plan.affectedLanes.length} ownership lane(s) require invalidation, ${affectedHandoffs} pending handoff(s) require cancellation or review, and ${plan.staleApprovals.length} approval(s) are stale. ${plan.adapterActions.length} future runtime action(s) are required. No runtime action was executed.`;
}

export function createRevocationDeviceCenterSummary(
  plan: SummaryInput,
): string {
  return `${plan.hostState === "blocked" ? "Blocked" : "Revoked"} host. ${plan.affectedLanes.length} active ownership lane(s) are invalid, ${plan.staleApprovals.length} approval(s) require review, and all listed adapter actions are dry-run guidance only. No runtime action was executed.`;
}

export function evaluateLucaLinkRevocationPropagation(
  input: LucaLinkRevocationPropagationInput,
): LucaLinkRevocationPropagationPlan {
  const hostState = getHostStatus(input);
  const affectedLanes = evaluateAffectedLanes(input, hostState);
  const cancelledHandoffs = (input.pendingHandoffs ?? []).map((handoff) =>
    classifyRevocationPendingHandoff(handoff, input.host.hostId),
  );
  const staleApprovals = evaluateApprovals(
    input.approvals ?? [],
    input.host.hostId,
  );
  const blockedPermissions = createRevocationBlockedPermissions();
  const adapterActions = createAdapterActions(
    input.host.hostId,
    hostState,
    cancelledHandoffs,
  );
  const requiresUserReview =
    affectedLanes.some(
      (lane) =>
        lane.disposition === "invalidate_and_review" ||
        lane.disposition === "primary_host_review",
    ) ||
    cancelledHandoffs.some(
      (handoff) => handoff.disposition === "requires_review",
    ) ||
    staleApprovals.some((approval) => approval.primaryHostReviewRequired);

  const summaryInput: SummaryInput = {
    hostId: input.host.hostId,
    hostState,
    affectedLanes,
    cancelledHandoffs,
    staleApprovals,
    adapterActions,
  };

  return {
    ...summaryInput,
    generatedAt: input.generatedAt,
    blockedPermissions,
    auditEvents: [
      {
        eventType: "lucalink_host_revocation_propagation_required",
        hostId: input.host.hostId,
        hostState,
        severity: hostState === "blocked" ? "critical" : "warning",
        message: createRevocationOperationSummary(summaryInput),
        dryRunOnly: true,
        recorded: false,
      },
    ],
    deviceCenterState: {
      hostId: input.host.hostId,
      connectionState: hostState,
      label: hostState === "blocked" ? "Blocked" : "Revoked",
      activeOwnershipInvalid: affectedLanes.length > 0,
      reviewRequired: requiresUserReview,
      runtimeActionExecuted: false,
    },
    operationCenterSummary: createRevocationOperationSummary(summaryInput),
    deviceCenterSummary: createRevocationDeviceCenterSummary(summaryInput),
    requiresUserReview,
    sideEffectsPerformed: false,
    dryRunOnly: true,
  };
}
