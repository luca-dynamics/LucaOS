import type { LucaExperienceMode } from "../../../experience/experienceMode";
import type {
  LucaLinkLinkedHostRecord,
  LucaLinkLinkedHostTrustState,
  LucaLinkPermissionId,
} from "../lucaLinkLinkedHostRegistry";
import type { LucaLinkApprovalAction, LucaLinkApprovalActionDisclosureSummary, LucaLinkApprovalActionPreview, LucaLinkApprovalActionStatePreview, LucaLinkApprovalOperationCenterSummary } from "./lucaLinkApprovalActionTypes";

export const LUCA_LINK_RUNTIME_DISABLED_PERMISSIONS: readonly LucaLinkPermissionId[] = [
  "remote_action",
  "tool_execution",
  "admin_trust",
];

export function createLucaLinkApprovalActionStatePreview(
  host: LucaLinkLinkedHostRecord,
  override?: Partial<Pick<LucaLinkApprovalActionStatePreview, "connectionState" | "trustState">>,
): LucaLinkApprovalActionStatePreview {
  const blockedPermissions = host.permissionProfile.permissions
    .filter((permission) => permission.state === "denied")
    .map((permission) => permission.id);
  const approvalRequiredPermissions = host.permissionProfile.permissions
    .filter(
      (permission) =>
        permission.state === "pending" ||
        permission.state === "requested" ||
        LUCA_LINK_RUNTIME_DISABLED_PERMISSIONS.includes(permission.id),
    )
    .map((permission) => permission.id);
  return {
    connectionState: override?.connectionState ?? host.connectionState,
    trustState: override?.trustState ?? host.trustState,
    blockedPermissions: [...new Set([...blockedPermissions, ...LUCA_LINK_RUNTIME_DISABLED_PERMISSIONS])],
    approvalRequiredPermissions: [...new Set(approvalRequiredPermissions)],
  };
}

export function canPreviewHostApproval(host: LucaLinkLinkedHostRecord): boolean {
  return (
    host.connectionState === "pending_approval" ||
    host.connectionState === "pairing" ||
    host.trustState === "pending" ||
    host.trustState === "untrusted"
  );
}

export function canPreviewHostRevocation(host: LucaLinkLinkedHostRecord): boolean {
  return host.trustState === "trusted_limited" || host.trustState === "trusted_full";
}

export function proposedTrustForAction(
  action: LucaLinkApprovalAction,
  host: LucaLinkLinkedHostRecord,
): Pick<LucaLinkApprovalActionStatePreview, "connectionState" | "trustState"> {
  if (action === "approve_host") return { connectionState: "online", trustState: "trusted_limited" };
  if (action === "deny_host") return { connectionState: "blocked", trustState: "revoked" };
  if (action === "revoke_host") return { connectionState: "revoked", trustState: "revoked" };
  if (action === "block_host") return { connectionState: "blocked", trustState: "revoked" };
  return { connectionState: host.connectionState, trustState: host.trustState };
}

function maskHostId(hostId: string): string {
  if (hostId.length <= 8) return "hidden";
  return `${hostId.slice(0, 4)}…${hostId.slice(-4)}`;
}

export function createLucaLinkApprovalDisclosureSummary(
  preview: LucaLinkApprovalActionPreview,
  mode: LucaExperienceMode,
): LucaLinkApprovalActionDisclosureSummary {
  const base = {
    mode,
    title: preview.action.replace(/_/g, " "),
    simpleStatus: preview.decision === "blocked" ? "Blocked" : preview.decision === "allowed" ? "Preview ready" : "Needs your approval",
    explanation: preview.reason,
    sensitiveAccessCopy: "Sensitive access remains blocked.",
    runtimeCopy: "No runtime action executed.",
  } satisfies LucaLinkApprovalActionDisclosureSummary;

  if (mode === "basic") return base;

  const counts = {
    affectedLanes: preview.revocationDryRun?.affectedLanes.length,
    staleApprovals: preview.revocationDryRun?.staleApprovals.length,
    blockedPermissions: preview.revocationDryRun?.blockedPermissions.length ?? preview.proposedState.blockedPermissions.length,
    adapterActions: preview.revocationDryRun?.adapterActions.length,
  };

  if (mode === "pro") {
    return {
      ...base,
      counts,
    };
  }

  return {
    ...base,
    counts,
    diagnosticHostId: maskHostId(preview.hostId),
    affectedLanes: preview.revocationDryRun?.affectedLanes.map((lane) => lane.lane),
    dryRunAdapterActions: preview.revocationDryRun?.adapterActions.map((action) => action.action),
    auditEventPreview: preview.revocationDryRun?.auditEvents.map((event) => event.eventType),
    modelFlags: [`sideEffectsPerformed:${preview.sideEffectsPerformed}`, `previewOnly:${preview.previewOnly}`],
  };
}

export function normalizeTrustForSession(trustState: LucaLinkLinkedHostTrustState): LucaLinkLinkedHostTrustState {
  return trustState;
}

export function createLucaLinkApprovalOperationCenterSummary(
  preview: LucaLinkApprovalActionPreview,
): LucaLinkApprovalOperationCenterSummary {
  return {
    title: preview.action === "review_handoff" ? "LucaLink handoff review" : "LucaLink approval review",
    actionPreview: preview.action,
    affectedLanes: preview.revocationDryRun?.affectedLanes.length ?? 0,
    blockedPermissions:
      preview.revocationDryRun?.blockedPermissions.length ??
      preview.proposedState.blockedPermissions.length,
    runtimeExecution: "disabled",
    sideEffects: "none",
    primaryHostReview: preview.requiresPrimaryHostReview
      ? "required"
      : "not_required",
    previewOnly: true,
  };
}
