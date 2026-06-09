import type { LucaLinkGovernanceEvaluation } from "../governance";
import {
  getLucaLinkSessionHostRolePriority,
  isLucaLinkReadOnlyLane,
  isLucaLinkRoleAllowedForLane,
} from "./lucaLinkSessionOwnershipPolicy";
import type {
  LucaLinkHandoffReadinessEvaluation,
  LucaLinkHandoffReadinessInput,
  LucaLinkSessionHost,
  LucaLinkSessionLane,
  LucaLinkSessionOwner,
  LucaLinkSessionOwnershipEvaluation,
  LucaLinkSessionOwnershipState,
} from "./lucaLinkSessionOwnershipTypes";

const MODEL_ONLY_RESULT = {
  modelOnly: true,
  sideEffectsPerformed: false,
} as const;

function asOwner(host: LucaLinkSessionHost): LucaLinkSessionOwner {
  return {
    hostId: host.hostId,
    displayName: host.displayName,
    role: host.role,
  };
}

function terminalHostEvaluation(
  lane: LucaLinkSessionLane,
  host: LucaLinkSessionHost,
): LucaLinkSessionOwnershipEvaluation | undefined {
  if (host.connectionState === "blocked" || host.role === "blocked") {
    return {
      lane,
      status: "blocked",
      reason: "host_blocked",
      requestedHostId: host.hostId,
      ...MODEL_ONLY_RESULT,
    };
  }
  if (
    host.connectionState === "revoked" ||
    host.trustState === "revoked" ||
    host.role === "revoked"
  ) {
    return {
      lane,
      status: "revoked",
      reason: "host_revoked",
      requestedHostId: host.hostId,
      ...MODEL_ONLY_RESULT,
    };
  }
  return undefined;
}

function evaluateHostForLane(
  lane: LucaLinkSessionLane,
  host: LucaLinkSessionHost,
): LucaLinkSessionOwnershipEvaluation {
  const terminal = terminalHostEvaluation(lane, host);
  if (terminal) return terminal;

  if (lane === "tool_execution_owner") {
    return {
      lane,
      status: "runtime_disabled",
      reason: "runtime_not_enabled",
      requestedHostId: host.hostId,
      ...MODEL_ONLY_RESULT,
    };
  }

  if (
    host.connectionState === "pairing" ||
    host.connectionState === "pending_approval" ||
    host.trustState === "pending" ||
    host.trustState === "untrusted"
  ) {
    return {
      lane,
      status: "pending_approval",
      reason: "approval_required",
      requestedHostId: host.hostId,
      ...MODEL_ONLY_RESULT,
    };
  }

  if (host.role === "read_only_observer") {
    if (!isLucaLinkReadOnlyLane(lane)) {
      return {
        lane,
        status: "unassigned",
        reason: "role_not_allowed_for_lane",
        requestedHostId: host.hostId,
        ...MODEL_ONLY_RESULT,
      };
    }
    return {
      lane,
      status: "read_only",
      reason: "read_only_observer",
      owner: asOwner(host),
      requestedHostId: host.hostId,
      ...MODEL_ONLY_RESULT,
    };
  }

  if (host.role === "handoff_target") {
    return {
      lane,
      status: "pending_approval",
      reason: "approval_required",
      requestedHostId: host.hostId,
      ...MODEL_ONLY_RESULT,
    };
  }

  if (!isLucaLinkRoleAllowedForLane(host.role, lane)) {
    return {
      lane,
      status: lane === "approval_owner" ? "pending_approval" : "unassigned",
      reason:
        lane === "approval_owner"
          ? "primary_host_required"
          : "role_not_allowed_for_lane",
      requestedHostId: host.hostId,
      ...MODEL_ONLY_RESULT,
    };
  }

  if (host.approvalState !== "approved") {
    return {
      lane,
      status: "pending_approval",
      reason: "approval_required",
      requestedHostId: host.hostId,
      ...MODEL_ONLY_RESULT,
    };
  }

  return {
    lane,
    status: "owned",
    owner: asOwner(host),
    requestedHostId: host.hostId,
    ...MODEL_ONLY_RESULT,
  };
}

export function evaluateLucaLinkSessionOwnership(
  state: LucaLinkSessionOwnershipState,
  lane: LucaLinkSessionLane,
): LucaLinkSessionOwnershipEvaluation {
  const requestedHostId = state.requestedOwners?.[lane];
  if (requestedHostId) {
    const requestedHost = state.hosts.find(
      (host) => host.hostId === requestedHostId,
    );
    if (!requestedHost) {
      return {
        lane,
        status: "unassigned",
        reason: "no_eligible_host",
        requestedHostId,
        ...MODEL_ONLY_RESULT,
      };
    }
    return evaluateHostForLane(lane, requestedHost);
  }

  if (lane === "tool_execution_owner") {
    return {
      lane,
      status: "runtime_disabled",
      reason: "runtime_not_enabled",
      ...MODEL_ONLY_RESULT,
    };
  }

  const candidates = [...state.hosts]
    .filter(
      (host) =>
        host.connectionState !== "blocked" &&
        host.connectionState !== "revoked" &&
        host.trustState !== "revoked" &&
        host.role !== "blocked" &&
        host.role !== "revoked" &&
        host.role !== "read_only_observer" &&
        host.role !== "handoff_target" &&
        (host.trustState === "trusted_limited" ||
          host.trustState === "trusted_full") &&
        host.connectionState !== "pairing" &&
        host.connectionState !== "pending_approval" &&
        host.approvalState === "approved" &&
        isLucaLinkRoleAllowedForLane(host.role, lane),
    )
    .sort((left, right) => {
      const roleDifference =
        getLucaLinkSessionHostRolePriority(left.role) -
        getLucaLinkSessionHostRolePriority(right.role);
      return roleDifference || left.hostId.localeCompare(right.hostId);
    });

  const owner = candidates[0];
  if (!owner) {
    return {
      lane,
      status: "unassigned",
      reason: lane === "approval_owner" ? "primary_host_required" : "no_eligible_host",
      ...MODEL_ONLY_RESULT,
    };
  }

  return evaluateHostForLane(lane, owner);
}

function governanceReadiness(
  governanceDecision: LucaLinkGovernanceEvaluation,
): Pick<LucaLinkHandoffReadinessEvaluation, "readiness" | "reason"> | undefined {
  if (governanceDecision.decision === "revoked") {
    return { readiness: "revoked", reason: "governance_revoked" };
  }
  if (governanceDecision.decision === "pending") {
    return { readiness: "approval_required", reason: "governance_pending" };
  }
  if (governanceDecision.decision === "denied") {
    return { readiness: "blocked", reason: "governance_denied" };
  }
  return undefined;
}

export function evaluateLucaLinkHandoffReadiness(
  input: LucaLinkHandoffReadinessInput,
): LucaLinkHandoffReadinessEvaluation {
  const base = {
    fromHostId: input.fromHost.hostId,
    toHostId: input.toHost.hostId,
    lane: input.lane,
    classificationOnly: true,
    sideEffectsPerformed: false,
  } as const;

  if (
    input.fromHost.connectionState === "blocked" ||
    input.fromHost.role === "blocked"
  ) {
    return { ...base, readiness: "blocked", reason: "host_blocked" };
  }
  if (
    input.fromHost.connectionState === "revoked" ||
    input.fromHost.trustState === "revoked" ||
    input.fromHost.role === "revoked"
  ) {
    return { ...base, readiness: "revoked", reason: "host_revoked" };
  }
  if (
    input.toHost.connectionState === "blocked" ||
    input.toHost.role === "blocked"
  ) {
    return { ...base, readiness: "blocked", reason: "host_blocked" };
  }
  if (
    input.toHost.connectionState === "revoked" ||
    input.toHost.trustState === "revoked" ||
    input.toHost.role === "revoked"
  ) {
    return { ...base, readiness: "revoked", reason: "host_revoked" };
  }
  if (
    input.lane === "remote_action" ||
    input.lane === "tool_execution_owner"
  ) {
    return {
      ...base,
      readiness: "runtime_disabled",
      reason: "runtime_not_enabled",
    };
  }
  const governance = governanceReadiness(input.governanceDecision);
  if (governance) return { ...base, ...governance };

  if (input.toHost.role === "read_only_observer") {
    if (isLucaLinkReadOnlyLane(input.lane)) {
      return { ...base, readiness: "read_only", reason: "read_only_observer" };
    }
    return {
      ...base,
      readiness: "unsupported",
      reason: "role_not_allowed_for_lane",
    };
  }
  if (
    input.lane === "approval_owner" &&
    input.toHost.role !== "primary_host"
  ) {
    return {
      ...base,
      readiness: "approval_required",
      reason: "primary_host_required",
    };
  }

  if (input.fromHost.hostId === input.toHost.hostId) {
    return { ...base, readiness: "unsupported", reason: "target_same_as_source" };
  }

  if (input.toHost.role === "handoff_target") {
    return {
      ...base,
      readiness: "approval_required",
      reason: "approval_required",
    };
  }

  const ownershipLane = input.lane;
  const targetEvaluation = evaluateLucaLinkSessionOwnership(
    {
      ...input.sessionOwnershipState,
      requestedOwners: {
        ...input.sessionOwnershipState.requestedOwners,
        [ownershipLane]: input.toHost.hostId,
      },
    },
    ownershipLane,
  );

  if (targetEvaluation.status === "owned") {
    return { ...base, readiness: "ready" };
  }
  if (targetEvaluation.status === "read_only") {
    return { ...base, readiness: "read_only", reason: targetEvaluation.reason };
  }
  if (targetEvaluation.status === "pending_approval") {
    return {
      ...base,
      readiness: "approval_required",
      reason: targetEvaluation.reason,
    };
  }
  if (targetEvaluation.status === "blocked") {
    return { ...base, readiness: "blocked", reason: targetEvaluation.reason };
  }
  if (targetEvaluation.status === "revoked") {
    return { ...base, readiness: "revoked", reason: targetEvaluation.reason };
  }
  if (targetEvaluation.status === "runtime_disabled") {
    return {
      ...base,
      readiness: "runtime_disabled",
      reason: targetEvaluation.reason,
    };
  }
  return { ...base, readiness: "unsupported", reason: targetEvaluation.reason };
}
