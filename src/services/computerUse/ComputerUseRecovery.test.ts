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
  prefersSandbox: false,
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

  it("recovery suggests retry_sandbox for failed non-sandbox action", () => {
    const recovery = new ComputerUseRecovery();
    const plan = recovery.createRecoveryPlan(baseInput);

    expect(plan.strategy).toBe("retry_sandbox");
  });

  it("recovery escalates for dangerous/repeated failure", () => {
    const recovery = new ComputerUseRecovery({ maxRetriesBeforeEscalation: 2 });

    const repeatedPlan = recovery.createRecoveryPlan({ ...baseInput, attemptCount: 3 });
    const dangerousPlan = recovery.createRecoveryPlan({ ...baseInput, dangerousContext: true });

    expect(repeatedPlan.strategy).toBe("escalate_to_user");
    expect(dangerousPlan.strategy).toBe("escalate_to_user");
  });
});
