import {
  ComputerUseMissionEngineBridgeOptions,
  ComputerUseMissionStepInput,
  ComputerUseMissionStepResult,
  ComputerUseMissionStepStatus,
  ComputerUsePipelineResult,
} from "./types";

export class ComputerUseMissionEngineBridge {
  constructor(private readonly options: ComputerUseMissionEngineBridgeOptions = {}) {}

  toMissionStepInput(step: ComputerUseMissionStepInput): ComputerUseMissionStepInput {
    return { ...step };
  }

  fromPipelineResult(pipelineResult: ComputerUsePipelineResult): Pick<ComputerUseMissionStepResult, "status" | "reason"> {
    const hasFailedExecution = pipelineResult.executionResults.some(
      (execution) => execution.status === "failed" || execution.status === "denied",
    );
    if (hasFailedExecution) return { status: "failed", reason: "execution failed" };

    const hasObserveSkippedInconclusive = pipelineResult.executionResults.some(
      (execution, index) =>
        execution.action.type === "observe" &&
        execution.status === "skipped" &&
        pipelineResult.verificationResults[index]?.status === "inconclusive",
    );

    const hasAnyExecution = pipelineResult.executionResults.length > 0;
    const pairedCount = Math.min(pipelineResult.executionResults.length, pipelineResult.verificationResults.length);
    const allExecutedPassed =
      hasAnyExecution &&
      pairedCount === pipelineResult.executionResults.length &&
      pipelineResult.executionResults.every((execution, index) => execution.status === "executed" && pipelineResult.verificationResults[index]?.status === "passed");

    if (allExecutedPassed) return { status: "completed", reason: "execution completed" };
    if (hasObserveSkippedInconclusive) return { status: "inconclusive", reason: "observation inconclusive" };

    return { status: "inconclusive", reason: "result inconclusive" };
  }

  toMissionStepResult(input: { missionStep: ComputerUseMissionStepInput; pipelineResult: ComputerUsePipelineResult }): ComputerUseMissionStepResult {
    const mapped = this.fromPipelineResult(input.pipelineResult);
    const reason = this.options.defaultReasonByStatus?.[mapped.status as ComputerUseMissionStepStatus] ?? mapped.reason;

    return {
      missionId: input.missionStep.missionId,
      stepId: input.missionStep.stepId,
      kind: "computer_use",
      status: mapped.status,
      pipelineResult: input.pipelineResult,
      reason,
      metadata: { bridgeKind: "scaffold", missionEngineImported: false },
    };
  }

  isComputerUseStep(step: { kind?: string }): boolean {
    return step.kind === "computer_use";
  }

  reset(): void {}
}
