import { describe, expect, it } from "vitest";
import { ComputerUseRecovery } from "./ComputerUseRecovery";
import { ComputerUseRecoveryInput } from "./types";

const baseInput: ComputerUseRecoveryInput = {
  verification: {
    status: "failed",
    followUpObservationRequired: false,
    reason: "failed",
    metadata: {
      verifierKind: "scaffold",
      systemApisCalled: false,
      screenshotsCaptured: false,
    },
  },
  executionResult: {
    status: "failed",
    action: { type: "click", reason: "click", requiresGuardApproval: false },
    metadata: {
      reason: "failed",
      systemApisCalled: false,
      delegatesOnly: true,
      noDirectSystemCalls: true,
      executorKind: "scaffold",
    },
  },
  attemptCount: 1,
  dangerousContext: false,
  executionMode: "direct_host",
};

describe("ComputerUseRecovery", () => {
  it("recovery suggests observe_again for inconclusive", () => {
    const recovery = new ComputerUseRecovery();
    const plan = recovery.createRecoveryPlan({
      ...baseInput,
      verification: { ...baseInput.verification, status: "inconclusive" },
      executionResult: {
        ...baseInput.executionResult,
        action: { type: "observe", reason: "observe", requiresGuardApproval: false },
      },
    });

    expect(plan.strategy).toBe("observe_again");
  });

  it("recovery suggests request_guard_approval for denied approval", () => {
    const recovery = new ComputerUseRecovery();
    const plan = recovery.createRecoveryPlan({
      ...baseInput,
      executionResult: {
        ...baseInput.executionResult,
        status: "denied",
        metadata: { ...baseInput.executionResult.metadata!, reason: "approval required" },
      },
    });

    expect(plan.strategy).toBe("request_guard_approval");
  });

  it("failed action with executionMode direct_host suggests retry_sandbox", () => {
    const recovery = new ComputerUseRecovery();
    const plan = recovery.createRecoveryPlan({ ...baseInput, executionMode: "direct_host" });

    expect(plan.strategy).toBe("retry_sandbox");
  });

  it("failed action with executionMode sandbox does not suggest retry_sandbox", () => {
    const recovery = new ComputerUseRecovery();
    const plan = recovery.createRecoveryPlan({ ...baseInput, executionMode: "sandbox" });

    expect(plan.strategy).not.toBe("retry_sandbox");
    expect(plan.strategy).toBe("none");
  });

  it("failed action with unknown executionMode does not blindly suggest retry_sandbox", () => {
    const recovery = new ComputerUseRecovery();
    const plan = recovery.createRecoveryPlan({ ...baseInput, executionMode: undefined });

    expect(plan.strategy).not.toBe("retry_sandbox");
    expect(plan.strategy).toBe("escalate_to_user");
  });

  it("recovery escalates for dangerous/repeated failure", () => {
    const recovery = new ComputerUseRecovery({ maxRetriesBeforeEscalation: 2 });

    const repeatedPlan = recovery.createRecoveryPlan({ ...baseInput, attemptCount: 3, executionMode: "direct_host" });
    const dangerousPlan = recovery.createRecoveryPlan({ ...baseInput, dangerousContext: true, executionMode: "direct_host" });

    expect(repeatedPlan.strategy).toBe("escalate_to_user");
    expect(dangerousPlan.strategy).toBe("escalate_to_user");
  });
});
