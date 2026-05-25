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

    if (result.metadata?.systemApisCalled === true) {
      return this.failed("Verification failed because system APIs were called.");
    }

    if (result.status === "failed" || result.status === "denied") {
      return this.failed(result.metadata?.reason ?? "Execution failed verification.");
    }

    if (result.status === "skipped" && result.action.type === "observe") {
      return this.inconclusive("Observe action was skipped; follow-up observation is required.", true);
    }

    if (result.status === "pending") {
      return this.inconclusive("Execution is still pending.");
    }

    if (result.status === "approved") {
      return this.inconclusive("Execution was approved but not yet executed.");
    }

    if (result.status === "skipped") {
      return this.inconclusive("Execution was skipped.");
    }

    if (result.status === "executed") {
      return {
        status: "passed",
        followUpObservationRequired: false,
        reason: "Execution result passed verification.",
        metadata: this.baseMetadata(),
      };
    }

    return this.inconclusive("Execution state is inconclusive.");
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

  private failed(reason: string): ComputerUseVerificationResult {
    return { status: "failed", followUpObservationRequired: false, reason, metadata: this.baseMetadata() };
  }

  private inconclusive(reason: string, followUpObservationRequired = false): ComputerUseVerificationResult {
    return { status: "inconclusive", followUpObservationRequired, reason, metadata: this.baseMetadata() };
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
  executionMode?: ComputerUseRecoveryInput["executionMode"];
}): ComputerUseRecoveryInput {
  return {
    verification: input.verification,
    executionResult: input.executionResult,
    attemptCount: input.attemptCount,
    dangerousContext: input.dangerousContext,
    executionMode: input.executionMode,
  };
}
