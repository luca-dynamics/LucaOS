import type {
  LucaLinkLinkedHostConnectionState,
  LucaLinkLinkedHostTrustState,
  LucaLinkPermissionId,
  LucaLinkPermissionState,
} from "../lucaLinkLinkedHostRegistry";

export type LucaLinkGovernanceDecision =
  | "allowed"
  | "denied"
  | "pending"
  | "revoked";

export type LucaLinkApprovalState =
  | "approved"
  | "pending"
  | "denied"
  | "revoked";

export type LucaLinkGovernanceTrustState =
  | LucaLinkLinkedHostTrustState
  | "limited"
  | "trusted"
  | "blocked";

export interface LucaLinkGovernanceInput {
  trustState: LucaLinkGovernanceTrustState;
  permissionState: LucaLinkPermissionState;
  approvalState: LucaLinkApprovalState;
  connectionState: LucaLinkLinkedHostConnectionState;
}

export interface LucaLinkPermissionEvaluationInput extends LucaLinkGovernanceInput {
  permission: LucaLinkPermissionId;
}

export interface LucaLinkGovernanceEvaluation {
  decision: LucaLinkGovernanceDecision;
  reason: string;
}

export interface LucaLinkPermissionEvaluation extends LucaLinkGovernanceEvaluation {
  permission: LucaLinkPermissionId;
  sensitive: boolean;
}

export interface LucaLinkRevocableGovernanceState {
  trustState: LucaLinkGovernanceTrustState;
  approvalState: LucaLinkApprovalState;
  connectionState: LucaLinkLinkedHostConnectionState;
  permissionStates: Partial<
    Record<LucaLinkPermissionId, LucaLinkPermissionState>
  >;
}
