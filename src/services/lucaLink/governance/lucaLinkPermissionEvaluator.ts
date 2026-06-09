import {
  isLucaLinkPermissionSensitive,
  type LucaLinkPermissionId,
} from "../lucaLinkLinkedHostRegistry";
import { evaluateLucaLinkApproval } from "./lucaLinkApprovalEvaluator";
import { evaluateLucaLinkRevocation } from "./lucaLinkRevocationEvaluator";
import type {
  LucaLinkGovernanceDecision,
  LucaLinkGovernanceEvaluation,
  LucaLinkPermissionEvaluation,
  LucaLinkPermissionEvaluationInput,
} from "./lucaLinkGovernanceTypes";

function evaluateTrust(
  input: LucaLinkPermissionEvaluationInput,
): LucaLinkGovernanceEvaluation | undefined {
  if (input.trustState === "untrusted") {
    return { decision: "denied", reason: "device_untrusted" };
  }
  if (input.trustState === "pending") {
    return { decision: "pending", reason: "trust_pending" };
  }
  return undefined;
}

function evaluateConnection(
  input: LucaLinkPermissionEvaluationInput,
): LucaLinkGovernanceEvaluation | undefined {
  if (input.connectionState === "pending_approval") {
    return { decision: "pending", reason: "connection_pending_approval" };
  }
  if (input.connectionState === "pairing") {
    return { decision: "pending", reason: "pairing_incomplete" };
  }
  return undefined;
}

export function canUsePermission(
  input: LucaLinkPermissionEvaluationInput,
): LucaLinkPermissionEvaluation {
  const sensitive = isLucaLinkPermissionSensitive(input.permission);
  const result =
    evaluateLucaLinkRevocation(input) ??
    evaluateTrust(input) ??
    evaluateLucaLinkApproval(input.approvalState) ??
    evaluateConnection(input) ??
    (input.permissionState === "denied"
      ? { decision: "denied" as const, reason: "permission_denied" }
      : input.permissionState === "pending" ||
          input.permissionState === "requested"
        ? { decision: "pending" as const, reason: "permission_pending" }
        : {
            decision: "allowed" as const,
            reason: `${input.trustState} + approved + permission_allowed`,
          });

  return { permission: input.permission, sensitive, ...result };
}

export function getLucaLinkGovernanceDecisionLabel(
  decision: LucaLinkGovernanceDecision,
): string {
  if (decision === "pending") return "Pending approval";
  return `${decision.charAt(0).toUpperCase()}${decision.slice(1)}`;
}

function permissionHelper(permission: LucaLinkPermissionId) {
  return (
    input: Omit<LucaLinkPermissionEvaluationInput, "permission">,
  ): LucaLinkPermissionEvaluation => canUsePermission({ ...input, permission });
}

export const canSyncMemory = permissionHelper("sync_memory");
export const canUseToolExecution = permissionHelper("tool_execution");
export const canPerformRemoteAction = permissionHelper("remote_action");
export const canRelayVoice = permissionHelper("voice_relay");
export const canShareScreen = permissionHelper("share_screen");
export const canExchangeFiles = permissionHelper("file_exchange");
