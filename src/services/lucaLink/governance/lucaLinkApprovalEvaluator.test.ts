import { describe, expect, it } from "vitest";
import { evaluateLucaLinkApproval } from "./lucaLinkApprovalEvaluator";

describe("evaluateLucaLinkApproval", () => {
  it("distinguishes approved, pending, denied, and revoked approval", () => {
    expect(evaluateLucaLinkApproval("approved")).toBeUndefined();
    expect(evaluateLucaLinkApproval("pending")).toEqual({
      decision: "pending",
      reason: "approval_pending",
    });
    expect(evaluateLucaLinkApproval("denied")).toEqual({
      decision: "denied",
      reason: "approval_denied",
    });
    expect(evaluateLucaLinkApproval("revoked")).toEqual({
      decision: "revoked",
      reason: "approval_revoked",
    });
  });
});
