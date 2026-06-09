import type {
  LucaLinkApprovalState,
  LucaLinkGovernanceEvaluation,
} from "./lucaLinkGovernanceTypes";

export function evaluateLucaLinkApproval(
  approvalState: LucaLinkApprovalState,
): LucaLinkGovernanceEvaluation | undefined {
  if (approvalState === "revoked") {
    return { decision: "revoked", reason: "approval_revoked" };
  }
  if (approvalState === "denied") {
    return { decision: "denied", reason: "approval_denied" };
  }
  if (approvalState === "pending") {
    return { decision: "pending", reason: "approval_pending" };
  }
  return undefined;
}
