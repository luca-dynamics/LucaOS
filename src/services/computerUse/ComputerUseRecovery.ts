import {
  ComputerUseRecoveryInput,
  ComputerUseRecoveryOptions,
  ComputerUseRecoveryPlan,
  ComputerUseRecoveryStrategy,
} from "./types";

export class ComputerUseRecovery {
  private readonly options: ComputerUseRecoveryOptions;

  constructor(options: ComputerUseRecoveryOptions = {}) {
    this.options = options;
  }

  createRecoveryPlan(input: ComputerUseRecoveryInput): ComputerUseRecoveryPlan {
    const strategy = this.selectStrategy(input);

    return {
      strategy,
      requiresGuardApprovalRequest: strategy === "request_guard_approval",
      shouldEscalateToUser: strategy === "escalate_to_user",
      reason: this.strategyReason(strategy),
      metadata: {
        recoveryKind: "scaffold",
        noRollbackPerformed: true,
        noSystemActionsPerformed: true,
      },
    };
  }

  selectStrategy(input: ComputerUseRecoveryInput): ComputerUseRecoveryStrategy {
    if (this.shouldEscalateToUser(input)) {
      return "escalate_to_user";
    }

    if (input.verification.status === "inconclusive" && input.executionResult.action.type === "observe") {
      return "observe_again";
    }

    if (this.shouldRequestApproval(input)) {
      return "request_guard_approval";
    }

    if (this.shouldRetryInSandbox(input)) {
      return "retry_sandbox";
    }

    return "none";
  }

  shouldRetryInSandbox(input: ComputerUseRecoveryInput): boolean {
    return input.verification.status === "failed" && input.prefersSandbox === false;
  }

  shouldRequestApproval(input: ComputerUseRecoveryInput): boolean {
    return (
      input.executionResult.status === "denied" &&
      input.executionResult.metadata?.reason?.toLowerCase().includes("approval") === true
    );
  }

  shouldEscalateToUser(input: ComputerUseRecoveryInput): boolean {
    const maxAttempts = this.options.maxRetriesBeforeEscalation ?? 2;
    return Boolean(input.dangerousContext || (input.attemptCount ?? 1) > maxAttempts);
  }

  reset(): void {
    void this.options;
  }

  private strategyReason(strategy: ComputerUseRecoveryStrategy): string {
    if (strategy === "observe_again") return "Verification is inconclusive; observe again.";
    if (strategy === "request_guard_approval") return "Action was denied for approval; request guard approval.";
    if (strategy === "retry_sandbox") return "Action failed outside sandbox; retry in sandbox.";
    if (strategy === "escalate_to_user") return "Repeated failures or dangerous context require user escalation.";
    return "No recovery action needed.";
  }
}
