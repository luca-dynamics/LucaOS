import type { LucaLinkPermissionId } from "../lucaLinkLinkedHostRegistry";
import type { LucaLinkSessionLane } from "../sessionOwnership";
import type {
  LucaLinkRevocationBlockedPermission,
  LucaLinkRevocationLaneDisposition,
  LucaLinkRevocationPropagationReason,
  LucaLinkRevocationPropagationStatus,
} from "./lucaLinkRevocationPropagationTypes";

export const LUCA_LINK_REVOCATION_BLOCKED_PERMISSIONS = Object.freeze([
  "sync_memory",
  "relay_notifications",
  "share_screen",
  "voice_relay",
  "file_exchange",
  "remote_action",
  "tool_execution",
  "admin_trust",
] as const satisfies readonly LucaLinkPermissionId[]);

export const LUCA_LINK_REVOCATION_NON_RUNTIME_PERMISSIONS = Object.freeze([
  "remote_action",
  "tool_execution",
  "admin_trust",
] as const satisfies readonly LucaLinkPermissionId[]);

export function getRevocationTerminalReason(
  status: LucaLinkRevocationPropagationStatus,
): Extract<
  LucaLinkRevocationPropagationReason,
  "host_revoked" | "host_blocked"
> {
  return status === "blocked" ? "host_blocked" : "host_revoked";
}

export function getAffectedLaneDisposition(
  lane: LucaLinkSessionLane,
): LucaLinkRevocationLaneDisposition {
  if (lane === "tool_execution_owner") return "runtime_disabled";
  if (lane === "approval_owner") return "primary_host_review";
  if (
    lane === "voice_owner" ||
    lane === "display_owner" ||
    lane === "memory_context_owner" ||
    lane === "handoff_owner"
  ) {
    return "invalidate_and_review";
  }
  return "invalidate";
}

export function createRevocationBlockedPermissions(): LucaLinkRevocationBlockedPermission[] {
  return LUCA_LINK_REVOCATION_BLOCKED_PERMISSIONS.map((permission) => ({
    permission,
    state: LUCA_LINK_REVOCATION_NON_RUNTIME_PERMISSIONS.includes(
      permission as (typeof LUCA_LINK_REVOCATION_NON_RUNTIME_PERMISSIONS)[number],
    )
      ? "runtime_disabled"
      : "blocked",
    reason:
      permission === "remote_action" ||
      permission === "tool_execution" ||
      permission === "admin_trust"
        ? "runtime_not_enabled"
        : "permission_invalidated",
  }));
}
