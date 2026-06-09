import { canUsePermission } from "../governance";
import {
  evaluateLucaLinkHandoffReadiness,
  evaluateLucaLinkSessionOwnership,
  type LucaLinkSessionHost,
} from "../sessionOwnership";
import { evaluateLucaLinkRevocationPropagation } from "../revocationPropagation";
import type { LucaLinkLinkedHostRecord, LucaLinkPermissionId } from "../lucaLinkLinkedHostRegistry";
import {
  canPreviewHostApproval,
  canPreviewHostRevocation,
  createLucaLinkApprovalActionStatePreview,
  LUCA_LINK_RUNTIME_DISABLED_PERMISSIONS,
  proposedTrustForAction,
} from "./lucaLinkApprovalActionPolicy";
import type {
  LucaLinkApprovalActionInput,
  LucaLinkApprovalActionPreview,
  LucaLinkApprovalActionRisk,
  LucaLinkHandoffReviewInput,
  LucaLinkHandoffReviewSummary,
} from "./lucaLinkApprovalActionTypes";

const PREVIEW_FLAGS = { sideEffectsPerformed: false, previewOnly: true } as const;

function linkedHostToSessionHost(host: LucaLinkLinkedHostRecord): LucaLinkSessionHost {
  return {
    hostId: host.id,
    displayName: host.displayName,
    role: host.isCurrentDevice ? "primary_host" : host.connectionState === "blocked" ? "blocked" : host.connectionState === "revoked" || host.trustState === "revoked" ? "revoked" : host.deviceType === "display" ? "display_surface" : "active_companion",
    trustState: host.trustState,
    connectionState: host.connectionState,
    approvalState: host.trustState === "revoked" ? "revoked" : host.trustState === "pending" || host.trustState === "untrusted" ? "pending" : "approved",
  };
}

function basePreview(input: LucaLinkApprovalActionInput): Omit<LucaLinkApprovalActionPreview, "decision" | "reason" | "risk" | "warnings" | "requiresConfirmation" | "requiresPrimaryHostReview" | "runtimeDisabled"> {
  return {
    hostId: input.host.id,
    action: input.action,
    currentState: createLucaLinkApprovalActionStatePreview(input.host),
    proposedState: createLucaLinkApprovalActionStatePreview(
      input.host,
      proposedTrustForAction(input.action, input.host),
    ),
    ...PREVIEW_FLAGS,
  };
}

function permissionWarnings(): string[] {
  return [
    "Preview only: no pairing, transport, handoff, socket, or runtime action will run.",
    "remote_action, tool_execution, and admin_trust remain runtime-disabled.",
  ];
}

function previewRevocation(input: LucaLinkApprovalActionInput, blocked: boolean) {
  const sessionHost = input.sessionHost ?? linkedHostToSessionHost({
    ...input.host,
    connectionState: blocked ? "blocked" : "revoked",
    trustState: "revoked",
  });
  return evaluateLucaLinkRevocationPropagation({
    host: sessionHost,
    primaryHost: input.primaryHost,
    generatedAt: input.generatedAt ?? "2026-06-09T00:00:00.000Z",
    ownershipAssignments: input.revocationInput?.ownershipAssignments ?? [],
    pendingHandoffs: input.revocationInput?.pendingHandoffs ?? [],
    approvals: input.revocationInput?.approvals ?? [],
  });
}

export function createLucaLinkHandoffReviewSummary(
  input: LucaLinkHandoffReviewInput,
): LucaLinkHandoffReviewSummary {
  const ownershipLane = input.lane === "remote_action" ? "approval_owner" : input.lane;
  const ownership = evaluateLucaLinkSessionOwnership(
    {
      ...input.sessionOwnershipState,
      requestedOwners: {
        ...input.sessionOwnershipState.requestedOwners,
        [ownershipLane]: input.toHost.hostId,
      },
    },
    ownershipLane,
  );
  const readiness = evaluateLucaLinkHandoffReadiness(input);
  const runtimeDisabled =
    input.lane === "remote_action" ||
    input.lane === "tool_execution_owner" ||
    ownership.status === "runtime_disabled";
  const approvalOwner = input.approvalOwnerHostId;
  const primaryHost = input.sessionOwnershipState.hosts.find(
    (host) => host.role === "primary_host",
  );
  const requiresPrimaryHostReview =
    runtimeDisabled ||
    ownership.status === "pending_approval" ||
    ownership.reason === "primary_host_required" ||
    (Boolean(approvalOwner) && approvalOwner !== primaryHost?.hostId);

  return {
    handoffId: input.handoffId,
    fromHostId: input.fromHost.hostId,
    toHostId: input.toHost.hostId,
    lane: input.lane,
    readiness: runtimeDisabled
      ? "runtime_disabled"
      : ownership.status === "read_only"
        ? "read_only"
        : readiness.readiness,
    reason: runtimeDisabled
      ? "runtime_disabled"
      : requiresPrimaryHostReview
        ? "primary_host_review_required"
        : readiness.reason,
    requiresPrimaryHostReview,
    runtimeDisabled,
    ...PREVIEW_FLAGS,
  };
}

function sensitivePermissionsStillBlocked(host: LucaLinkLinkedHostRecord): LucaLinkPermissionId[] {
  return host.permissionProfile.permissions
    .filter((permission) => {
      const result = canUsePermission({
        permission: permission.id,
        trustState: "trusted_limited",
        permissionState: permission.state,
        approvalState: permission.state === "allowed" ? "approved" : "pending",
        connectionState: "online",
      });
      return result.decision !== "allowed" || LUCA_LINK_RUNTIME_DISABLED_PERMISSIONS.includes(permission.id);
    })
    .map((permission) => permission.id);
}

export function previewLucaLinkApprovalAction(
  input: LucaLinkApprovalActionInput,
): LucaLinkApprovalActionPreview {
  const base = basePreview(input);
  if (input.action === "approve_host") {
    const allowed = canPreviewHostApproval(input.host);
    return {
      ...base,
      proposedState: {
        ...base.proposedState,
        trustState: "trusted_limited",
        blockedPermissions: sensitivePermissionsStillBlocked(input.host),
        approvalRequiredPermissions: [...new Set([...base.proposedState.approvalRequiredPermissions, ...LUCA_LINK_RUNTIME_DISABLED_PERMISSIONS])],
      },
      decision: allowed ? "approval_required" : "blocked",
      reason: allowed
        ? "Approve device preview defaults to limited trust and preserves sensitive permissions as approval-required."
        : "Only pending, pairing, or untrusted onboarding hosts can be approved from this preview.",
      risk: "medium",
      warnings: permissionWarnings(),
      requiresConfirmation: true,
      requiresPrimaryHostReview: true,
      runtimeDisabled: true,
    };
  }

  if (input.action === "deny_host") {
    const allowed = canPreviewHostApproval(input.host);
    return {
      ...base,
      decision: allowed ? "allowed" : "blocked",
      reason: allowed
        ? "Deny request preview blocks future handoff and permission use without disconnecting runtime transport."
        : "Deny preview is only available for pending or pairing hosts.",
      risk: "medium",
      warnings: permissionWarnings(),
      requiresConfirmation: false,
      requiresPrimaryHostReview: false,
      runtimeDisabled: true,
    };
  }

  if (input.action === "revoke_host" || input.action === "block_host") {
    const isBlock = input.action === "block_host";
    const allowed = canPreviewHostRevocation(input.host) || input.host.connectionState === "revoked" || input.host.connectionState === "blocked";
    const dryRun = previewRevocation(input, isBlock);
    return {
      ...base,
      decision: allowed ? "approval_required" : "blocked",
      reason: isBlock
        ? "Block host preview is stronger than revoke and composes the revocation propagation dry-run without executing adapter actions."
        : "Revoke access preview composes revocation propagation dry-run and does not disconnect transport or mutate ownership.",
      risk: isBlock ? "critical" : ("high" satisfies LucaLinkApprovalActionRisk),
      warnings: [
        ...permissionWarnings(),
        dryRun.deviceCenterSummary,
      ],
      requiresConfirmation: true,
      requiresPrimaryHostReview: dryRun.requiresUserReview,
      runtimeDisabled: true,
      revocationDryRun: dryRun,
    };
  }

  if (input.action === "review_handoff") {
    if (!input.handoff) {
      return {
        ...base,
        decision: "unsupported",
        reason: "Review handoff requires a handoff review input.",
        risk: "low",
        warnings: permissionWarnings(),
        requiresConfirmation: false,
        requiresPrimaryHostReview: false,
        runtimeDisabled: true,
      };
    }
    const summary = createLucaLinkHandoffReviewSummary(input.handoff);
    return {
      ...base,
      decision: summary.runtimeDisabled || summary.readiness === "blocked" || summary.readiness === "revoked" ? "blocked" : "review_only",
      reason: "Handoff readiness review is classification-only; no relay, migration, or transport action is executed.",
      risk: summary.runtimeDisabled ? "high" : "medium",
      warnings: permissionWarnings(),
      requiresConfirmation: false,
      requiresPrimaryHostReview: summary.requiresPrimaryHostReview,
      runtimeDisabled: summary.runtimeDisabled,
      handoffReview: summary,
    };
  }

  if (input.action === "cancel_handoff") {
    const summary = input.handoff
      ? { ...createLucaLinkHandoffReviewSummary(input.handoff), readiness: "blocked" as const, reason: "cancel_preview_only" as const }
      : undefined;
    return {
      ...base,
      decision: "review_only",
      reason: "Cancel handoff is a preview-only cancellation review with no transport changes.",
      risk: "low",
      warnings: permissionWarnings(),
      requiresConfirmation: false,
      requiresPrimaryHostReview: Boolean(summary?.requiresPrimaryHostReview),
      runtimeDisabled: true,
      handoffReview: summary,
    };
  }

  return {
    ...base,
    decision: "unsupported",
    reason: "Unsupported LucaLink local approval action.",
    risk: "low",
    warnings: permissionWarnings(),
    requiresConfirmation: false,
    requiresPrimaryHostReview: false,
    runtimeDisabled: true,
  };
}
