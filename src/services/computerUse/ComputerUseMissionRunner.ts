import {
  ComputerUseMissionRunnerOptions,
  ComputerUseMissionRunnerResult,
  ComputerUseMissionRunnerStepRecord,
  ComputerUseMissionStepInput,
} from "./types";

export class ComputerUseMissionRunner {
  constructor(private readonly options: ComputerUseMissionRunnerOptions) {}

  async runStep(step: ComputerUseMissionStepInput, index = 0): Promise<ComputerUseMissionRunnerStepRecord> {
    if (step.kind !== "computer_use") {
      return { index, missionId: step.missionId, stepId: step.stepId, kind: step.kind, status: "failed", reason: "non-computer_use step skipped" };
    }
    const result = await this.options.runtimeEntrypoint.runComputerUseStep(step);
    const status = result.stepResult?.status ?? "failed";
    const reason = result.stepResult?.reason ?? result.reason ?? "step failed";
    return { index, missionId: step.missionId, stepId: step.stepId, kind: step.kind, status, reason };
  }

  async runSteps(steps: ComputerUseMissionStepInput[]): Promise<ComputerUseMissionRunnerResult> {
    const results: ComputerUseMissionRunnerStepRecord[] = [];
    for (let i = 0; i < steps.length; i += 1) results.push(await this.runStep(steps[i], i));
    return { results, summary: this.createRunSummary(results), metadata: { runnerKind: "scaffold", systemApisCalled: false } };
  }

  createRunSummary(results: ComputerUseMissionRunnerStepRecord[]) {
    return {
      total: results.length,
      completed: results.filter((x) => x.status === "completed").length,
      failed: results.filter((x) => x.status === "failed").length,
      inconclusive: results.filter((x) => x.status === "inconclusive").length,
    };
  }

  reset(): void {
    this.options.runtimeEntrypoint.reset();
  }
}
