import { completeProductMission } from "../missionTape/completeProductMission";
import type { CompleteProductMissionResult } from "../missionTape/completeProductMission";
import {
  ensureComputerUseMissionControl,
  syncComputerUseStepGoalStatus,
} from "./computerUseMissionControl";
import {
  ComputerUseMissionRunnerOptions,
  ComputerUseMissionRunnerResult,
  ComputerUseMissionRunnerStepRecord,
  ComputerUseMissionStepInput,
} from "./types";

export type ComputerUseMissionRunnerResultWithCompletion =
  ComputerUseMissionRunnerResult & {
    productCompletion?: CompleteProductMissionResult;
    missionControlId?: number;
    stepGoalIds?: Record<string, number>;
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
    const missionId = steps.find((s) => s.missionId)?.missionId;
    let missionControlId: number | undefined;
    let stepGoalIds: Record<string, number> | undefined;

    // Link MissionControl + step goals before steps so Mission Center shows live progress.
    if (missionId && this.options.missionTapeCompletion?.linkMissionControl !== false) {
      try {
        const linked = await ensureComputerUseMissionControl(missionId, {
          intent: `computer-use:${missionId}`,
          steps: steps.map((s) => ({
            stepId: s.stepId,
            description: `computer_use:${s.stepId}`,
          })),
        });
        if (linked.linked) {
          missionControlId = linked.missionControlId;
          stepGoalIds = linked.stepGoalIds;
        }
      } catch {
        /* soft-fail */
      }
    }

    const results: ComputerUseMissionRunnerStepRecord[] = [];
    for (let i = 0; i < steps.length; i += 1) {
      const record = await this.runStep(steps[i], i);
      results.push(record);
      if (stepGoalIds) {
        try {
          await syncComputerUseStepGoalStatus(stepGoalIds, record.stepId, record.status);
        } catch {
          /* soft-fail */
        }
      }
    }
    const summary = this.createRunSummary(results);
    const base: ComputerUseMissionRunnerResultWithCompletion = {
      results,
      summary,
      metadata: { runnerKind: "scaffold", systemApisCalled: false },
      missionControlId,
      stepGoalIds,
    };

    const tapeOpt = this.options.missionTapeCompletion;
    const completeAfter = tapeOpt?.completeAfterRun !== false;
    if (!tapeOpt?.recorder || !completeAfter || !missionId || steps.length === 0) {
      return base;
    }

    const anyFailed = summary.failed > 0 || summary.inconclusive > 0;
    // Prefer MissionControl numeric id for tape/archive when linked.
    const completionMissionId =
      missionControlId != null ? String(missionControlId) : missionId;

    const productCompletion = await completeProductMission({
      missionId: completionMissionId,
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
      onCompletedArchive:
        missionControlId != null
          ? async (id) => {
              const numeric = Number(id);
              if (!Number.isFinite(numeric)) return;
              try {
                const { missionControlService } = await import(
                  "../agent/MissionControlService"
                );
                // completeProductMission already gated; archive if bridge up.
                if (typeof window !== "undefined" && window.luca?.missionControl?.archive) {
                  await missionControlService.archiveMission(numeric);
                }
              } catch {
                /* soft-fail */
              }
            }
          : undefined,
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
