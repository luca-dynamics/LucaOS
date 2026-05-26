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
    const execution = pipelineResult.executionResults[0];
    const verification = pipelineResult.verificationResults[0];

    if (execution?.status === "failed" || execution?.status === "denied") return { status: "failed", reason: "execution failed" };
    if (execution?.status === "executed" && verification?.status === "passed") return { status: "completed", reason: "execution completed" };
    if (execution?.action.type === "observe" && execution?.status === "skipped" && verification?.status === "inconclusive") {
      return { status: "inconclusive", reason: "observation inconclusive" };
    }

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
