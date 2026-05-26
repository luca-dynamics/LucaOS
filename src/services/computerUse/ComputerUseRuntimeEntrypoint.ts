import {
  ComputerUseRuntimeEntrypointInput,
  ComputerUseRuntimeEntrypointOptions,
  ComputerUseRuntimeEntrypointResult,
  ComputerUseMissionStepInput,
} from "./types";

export class ComputerUseRuntimeEntrypoint {
  constructor(private readonly options: ComputerUseRuntimeEntrypointOptions) {}

  async runComputerUseStep(step: ComputerUseMissionStepInput): Promise<ComputerUseRuntimeEntrypointResult> {
    if (!this.validateInput({ missionStepInput: step }).ok) return this.invalidResult("invalid mission step input");
    const stepResult = await this.options.missionStepAdapter.executeStep(step);
    return { ok: true, stepResult, metadata: { entrypointKind: "scaffold", systemApisCalled: false } };
  }

  async runPipelineInput(input: ComputerUseRuntimeEntrypointInput): Promise<ComputerUseRuntimeEntrypointResult> {
    const validation = this.validateInput(input);
    if (!validation.ok) return this.invalidResult(validation.reason ?? "invalid input");
    if (input.missionStepInput) return this.runComputerUseStep(input.missionStepInput);
    const pipelineResult = await this.options.pipeline.run(input.pipelineInput!);
    return { ok: true, pipelineResult, metadata: { entrypointKind: "scaffold", systemApisCalled: false } };
  }

  validateInput(input: ComputerUseRuntimeEntrypointInput): { ok: boolean; reason?: string } {
    if (input.missionStepInput) return { ok: Boolean(input.missionStepInput.missionId && input.missionStepInput.stepId) };
    if (input.pipelineInput) return { ok: Boolean(input.pipelineInput.missionId) };
    return { ok: false, reason: "no supported input provided" };
  }

  reset(): void {
    this.options.missionStepAdapter.reset();
    this.options.pipeline.reset();
  }

  private invalidResult(reason: string): ComputerUseRuntimeEntrypointResult {
    return { ok: false, reason, metadata: { entrypointKind: "scaffold", systemApisCalled: false } };
  }
}
