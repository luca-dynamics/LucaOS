import {
  ComputerUseExecutionResult,
  ComputerUseRecoveryInput,
  ComputerUseVerificationInput,
  ComputerUseVerificationResult,
  ComputerUseVerifierOptions,
} from "./types";

export class ComputerUseVerifier {
  private readonly options: ComputerUseVerifierOptions;

  constructor(options: ComputerUseVerifierOptions = {}) {
    this.options = options;
  }

  verifyPlanResults(input: ComputerUseVerificationInput): ComputerUseVerificationResult[] {
    return input.results.map((result) => this.verifyExecutionResult({ ...input, result }));
  }

  verifyExecutionResult(input: ComputerUseVerificationInput): ComputerUseVerificationResult {
    const { result } = input;

    if (result.metadata?.systemApisCalled) {
      return {
        status: "failed",
        followUpObservationRequired: false,
        reason: "Verification failed because system APIs were called.",
        metadata: this.baseMetadata(),
      };
    }

    if (result.status === "skipped" && result.action.type === "observe") {
      return {
        status: "inconclusive",
        followUpObservationRequired: true,
        reason: "Observe action was skipped; follow-up observation is required.",
        metadata: this.baseMetadata(),
      };
    }

    if (result.status === "failed" || result.status === "denied") {
      return {
        status: "failed",
        followUpObservationRequired: false,
        reason: result.metadata?.reason ?? "Execution failed verification.",
        metadata: this.baseMetadata(),
      };
    }

    return {
      status: "passed",
      followUpObservationRequired: false,
      reason: "Execution result passed verification.",
      metadata: this.baseMetadata(),
    };
  }

  isExecutionSuccessful(result: ComputerUseExecutionResult): boolean {
    const verification = this.verifyExecutionResult({ result, results: [result] });

    return verification.status === "passed";
  }

  requiresFollowUpObservation(input: ComputerUseVerificationInput): boolean {
    return this.verifyExecutionResult(input).followUpObservationRequired;
  }

  reset(): void {
    void this.options;
  }

  private baseMetadata(): NonNullable<ComputerUseVerificationResult["metadata"]> {
    return {
      verifierKind: "scaffold",
      systemApisCalled: false,
      screenshotsCaptured: false,
    };
  }
}

export function toRecoveryInput(input: {
  verification: ComputerUseVerificationResult;
  executionResult: ComputerUseExecutionResult;
  attemptCount?: number;
  dangerousContext?: boolean;
  prefersSandbox?: boolean;
}): ComputerUseRecoveryInput {
  return {
    verification: input.verification,
    executionResult: input.executionResult,
    attemptCount: input.attemptCount,
    dangerousContext: input.dangerousContext,
    prefersSandbox: input.prefersSandbox,
  };
}
