import type {
  LucaLinkLinkedHostConnectionState,
  LucaLinkLinkedHostTrustState,
} from "../lucaLinkLinkedHostRegistry";
import type {
  LucaLinkApprovalState,
  LucaLinkGovernanceEvaluation,
} from "../governance";

export type LucaLinkSessionLane =
  | "conversation_owner"
  | "voice_owner"
  | "display_owner"
  | "approval_owner"
  | "memory_context_owner"
  | "tool_execution_owner"
  | "handoff_owner";

export type LucaLinkSessionHostRole =
  | "primary_host"
  | "active_companion"
  | "voice_relay"
  | "display_surface"
  | "execution_candidate"
  | "read_only_observer"
  | "handoff_target"
  | "revoked"
  | "blocked";

export type LucaLinkSessionOwnershipStatus =
  | "owned"
  | "unassigned"
  | "pending_approval"
  | "blocked"
  | "revoked"
  | "read_only"
  | "runtime_disabled";

export type LucaLinkSessionOwnershipReason =
  | "primary_host_required"
  | "host_revoked"
  | "host_blocked"
  | "approval_required"
  | "role_not_allowed_for_lane"
  | "runtime_not_enabled"
  | "no_eligible_host"
  | "read_only_observer";

export interface LucaLinkSessionOwner {
  hostId: string;
  displayName: string;
  role: LucaLinkSessionHostRole;
}

export interface LucaLinkSessionHost extends LucaLinkSessionOwner {
  trustState: LucaLinkLinkedHostTrustState;
  connectionState: LucaLinkLinkedHostConnectionState;
  approvalState: LucaLinkApprovalState;
}

export interface LucaLinkSessionOwnershipState {
  sessionId: string;
  hosts: readonly LucaLinkSessionHost[];
  requestedOwners?: Partial<Record<LucaLinkSessionLane, string>>;
}

export interface LucaLinkSessionOwnershipEvaluation {
  lane: LucaLinkSessionLane;
  status: LucaLinkSessionOwnershipStatus;
  reason?: LucaLinkSessionOwnershipReason;
  owner?: LucaLinkSessionOwner;
  requestedHostId?: string;
  modelOnly: true;
  sideEffectsPerformed: false;
}

export type LucaLinkHandoffLane = LucaLinkSessionLane | "remote_action";

export type LucaLinkHandoffReadiness =
  | "ready"
  | "approval_required"
  | "blocked"
  | "revoked"
  | "read_only"
  | "runtime_disabled"
  | "unsupported";

export type LucaLinkHandoffReadinessReason =
  | LucaLinkSessionOwnershipReason
  | "governance_denied"
  | "governance_pending"
  | "governance_revoked"
  | "target_same_as_source";

export interface LucaLinkHandoffReadinessInput {
  fromHost: LucaLinkSessionHost;
  toHost: LucaLinkSessionHost;
  lane: LucaLinkHandoffLane;
  governanceDecision: LucaLinkGovernanceEvaluation;
  sessionOwnershipState: LucaLinkSessionOwnershipState;
}

export interface LucaLinkHandoffReadinessEvaluation {
  readiness: LucaLinkHandoffReadiness;
  reason?: LucaLinkHandoffReadinessReason;
  fromHostId: string;
  toHostId: string;
  lane: LucaLinkHandoffLane;
  classificationOnly: true;
  sideEffectsPerformed: false;
}
