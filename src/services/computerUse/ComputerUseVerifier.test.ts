import { describe, expect, it } from "vitest";
import { ComputerUseVerifier } from "./ComputerUseVerifier";
import { ComputerUseExecutionResult } from "./types";

const clickAction = { type: "click", reason: "click", requiresGuardApproval: false } as const;
const observeAction = { type: "observe", reason: "observe", requiresGuardApproval: false } as const;

function buildResult(result: Partial<ComputerUseExecutionResult>): ComputerUseExecutionResult {
  return {
    status: "executed",
    action: clickAction,
    metadata: {
      systemApisCalled: false,
      delegatesOnly: true,
      noDirectSystemCalls: true,
      executorKind: "scaffold",
    },
    ...result,
  };
}

describe("ComputerUseVerifier", () => {
  it("executed result verifies passed", () => {
    const verifier = new ComputerUseVerifier();
    const result = buildResult({ status: "executed" });

    const verification = verifier.verifyExecutionResult({ result, results: [result] });

    expect(verification.status).toBe("passed");
  });

  it("failed result verifies failed", () => {
    const verifier = new ComputerUseVerifier();
    const result = buildResult({ status: "failed" });

    const verification = verifier.verifyExecutionResult({ result, results: [result] });

    expect(verification.status).toBe("failed");
  });

  it("denied approval result verifies failed", () => {
    const verifier = new ComputerUseVerifier();
    const result = buildResult({ status: "denied" });

    const verification = verifier.verifyExecutionResult({ result, results: [result] });

    expect(verification.status).toBe("failed");
  });

  it("skipped observe verifies inconclusive + follow-up observation", () => {
    const verifier = new ComputerUseVerifier();
    const result = buildResult({ status: "skipped", action: observeAction });

    const verification = verifier.verifyExecutionResult({ result, results: [result] });

    expect(verification.status).toBe("inconclusive");
    expect(verification.followUpObservationRequired).toBe(true);
  });

  it("systemApisCalled true verifies failed", () => {
    const verifier = new ComputerUseVerifier();
    const result = buildResult({
      status: "executed",
      metadata: {
        systemApisCalled: true,
        delegatesOnly: true,
        noDirectSystemCalls: true,
        executorKind: "scaffold",
      },
    });

    const verification = verifier.verifyExecutionResult({ result, results: [result] });

    expect(verification.status).toBe("failed");
  });

  it("metadata says no system APIs called", () => {
    const verifier = new ComputerUseVerifier();
    const result = buildResult({ status: "executed" });

    const verification = verifier.verifyExecutionResult({ result, results: [result] });

    expect(verification.metadata.systemApisCalled).toBe(false);
  });
});
