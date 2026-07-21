import { completeProductMission } from "../missionTape/completeProductMission";
import type { CompleteProductMissionResult } from "../missionTape/completeProductMission";
import {
  ComputerUseMissionRunnerOptions,
  ComputerUseMissionRunnerResult,
  ComputerUseMissionRunnerStepRecord,
  ComputerUseMissionStepInput,
} from "./types";

export type ComputerUseMissionRunnerResultWithCompletion =
  ComputerUseMissionRunnerResult & {
    productCompletion?: CompleteProductMissionResult;
  };

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

  async runSteps(steps: ComputerUseMissionStepInput[]): Promise<ComputerUseMissionRunnerResultWithCompletion> {
    const results: ComputerUseMissionRunnerStepRecord[] = [];
    for (let i = 0; i < steps.length; i += 1) results.push(await this.runStep(steps[i], i));
    const summary = this.createRunSummary(results);
    const base: ComputerUseMissionRunnerResultWithCompletion = {
      results,
      summary,
      metadata: { runnerKind: "scaffold", systemApisCalled: false },
    };

    const tapeOpt = this.options.missionTapeCompletion;
    const completeAfter = tapeOpt?.completeAfterRun !== false;
    const missionId = steps.find((s) => s.missionId)?.missionId;
    if (!tapeOpt?.recorder || !completeAfter || !missionId || steps.length === 0) {
      return base;
    }

    const anyFailed = summary.failed > 0 || summary.inconclusive > 0;
    const productCompletion = await completeProductMission({
      missionId,
      intent: `computer-use:${missionId}`,
      recorder: tapeOpt.recorder,
      success: !anyFailed,
      verificationOverride: tapeOpt.verificationOverride,
      overrideReason: tapeOpt.overrideReason,
      steps: results.map((r) => ({
        stepId: r.stepId,
        goal: `computer_use:${r.stepId}`,
        status: r.status === "completed" ? "verified" : r.status === "failed" ? "failed" : "executed",
        kind: r.kind,
        notes: r.reason,
      })),
    });

    return {
      ...base,
      productCompletion,
    };
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
