import {
  ComputerUseMissionStepAdapterOptions,
  ComputerUseMissionStepAdapterResult,
  ComputerUseMissionStepInput,
  ComputerUsePipelineResult,
} from "./types";

export class ComputerUseMissionStepAdapter {
  constructor(private readonly options: ComputerUseMissionStepAdapterOptions) {}

  canHandleStep(step: { kind?: string }): boolean {
    return this.options.missionEngineBridge.isComputerUseStep(step);
  }

  async executeStep(step: ComputerUseMissionStepInput): Promise<ComputerUseMissionStepAdapterResult> {
    if (!this.canHandleStep(step)) return this.createStepResult(step, undefined, "failed", "unsupported step kind");
    const missionStep = this.options.missionEngineBridge.toMissionStepInput(step);
    const pipelineResult = await this.options.pipeline.run({ missionId: missionStep.missionId, ...(missionStep.input ?? {}) });
    const bridged = this.options.missionEngineBridge.toMissionStepResult({ missionStep, pipelineResult });
    return this.createStepResult(step, pipelineResult, bridged.status, bridged.reason);
  }

  createStepResult(
    step: ComputerUseMissionStepInput,
    pipelineResult: ComputerUsePipelineResult | undefined,
    status: ComputerUseMissionStepAdapterResult["status"],
    reason: string,
  ): ComputerUseMissionStepAdapterResult {
    return {
      missionId: step.missionId,
      stepId: step.stepId,
      kind: "computer_use",
      status,
      pipelineResult,
      reason,
      metadata: { adapterKind: "scaffold", systemApisCalled: false },
    };
  }

  reset(): void {
    this.options.pipeline.reset();
    this.options.missionEngineBridge.reset();
  }
}
