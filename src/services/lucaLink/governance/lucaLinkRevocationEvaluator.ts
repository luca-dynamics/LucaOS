import type {
  LucaLinkGovernanceEvaluation,
  LucaLinkGovernanceInput,
  LucaLinkRevocableGovernanceState,
} from "./lucaLinkGovernanceTypes";

export function evaluateLucaLinkRevocation(
  input: Pick<LucaLinkGovernanceInput, "trustState" | "connectionState">,
): LucaLinkGovernanceEvaluation | undefined {
  if (input.connectionState === "blocked" || input.trustState === "blocked") {
    return { decision: "denied", reason: "device_blocked" };
  }

  if (input.connectionState === "revoked" || input.trustState === "revoked") {
    return { decision: "revoked", reason: "device_revoked" };
  }

  return undefined;
}

export function revokeLucaLinkGovernanceState(
  state: LucaLinkRevocableGovernanceState,
): LucaLinkRevocableGovernanceState {
  return {
    ...state,
    trustState: "revoked",
    approvalState: "revoked",
    connectionState: "revoked",
    permissionStates: Object.fromEntries(
      Object.keys(state.permissionStates).map((permission) => [
        permission,
        "denied",
      ]),
    ),
  };
}
