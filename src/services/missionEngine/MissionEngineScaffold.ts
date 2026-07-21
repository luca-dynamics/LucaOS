/**
 * Absorb Phase 1 — thin mission engine scaffold.
 *
 * Pipeline (representation + tape + verification completion gate):
 *   intent → plan steps → execute stubs → verify → complete-with-gate
 *
 * Does not call host APIs or live tools. Safe product pilot for GSD discipline.
 */

import {
  createExecutionPlan,
  createExecutionStep,
  type LucaExecutionStepKind,
} from "../execution/LucaDeterministicExecution";
import { MissionTapeRecorderService } from "../missionTape/MissionTapeRecorder";
import { finalizeMissionTapeWithVerification } from "../missionTape/missionTapeCompletionGate";
import { MissionCheckpointStore } from "./MissionCheckpointStore";
import type { MissionResult, MissionStatus, MissionStep } from "./types";

export interface MissionEngineScaffoldStepInput {
  stepId?: string;
  goal: string;
  toolOrRuntime?: string;
  expectedOutput?: string;
  verification?: string;
  rollback?: string;
  riskLevel?: "safe" | "sensitive" | "dangerous";
  kind?: LucaExecutionStepKind;
  /** Simulate step outcome in scaffold (default true). */
  simulateSuccess?: boolean;
}

export interface MissionEngineScaffoldRunInput {
  missionId: string;
  intent: string;
  steps: MissionEngineScaffoldStepInput[];
  /** Origin override for completion despite failed gates. */
  verificationOverride?: boolean;
  overrideReason?: string;
  checkpointBeforeRiskySteps?: boolean;
}

export interface MissionEngineScaffoldRunResult {
  missionId: string;
  status: MissionStatus;
  success: boolean;
  stepsExecuted: number;
  checkpoints: number;
  completionBlocked: boolean;
  reason?: string;
  result: MissionResult;
}

function mapRisk(
  risk?: "safe" | "sensitive" | "dangerous",
): "low" | "medium" | "high" {
  if (risk === "dangerous") return "high";
  if (risk === "sensitive") return "medium";
  return "low";
}

export class MissionEngineScaffold {
  constructor(
    private readonly recorder: MissionTapeRecorderService = new MissionTapeRecorderService(),
    private readonly checkpoints: MissionCheckpointStore = new MissionCheckpointStore(),
  ) {}

  getRecorder(): MissionTapeRecorderService {
    return this.recorder;
  }

  getCheckpoints(): MissionCheckpointStore {
    return this.checkpoints;
  }

  async run(
    input: MissionEngineScaffoldRunInput,
  ): Promise<MissionEngineScaffoldRunResult> {
    await this.recorder.createTape(input.missionId, input.intent);

    const planSteps = input.steps.map((step, index) => {
      const kind =
        step.kind ??
        (step.toolOrRuntime?.includes("computer")
          ? "computer_use"
          : step.toolOrRuntime?.includes("file")
            ? "filesystem"
            : "tool_call");
      const riskLevel = mapRisk(step.riskLevel);
      return createExecutionStep({
        id: step.stepId ?? `step-${index + 1}`,
        summary: step.goal,
        kind,
        riskLevel,
        requiresRollback: riskLevel === "high",
        rollbackAvailable: Boolean(step.rollback),
        receiptRequired: riskLevel !== "low",
        receiptAvailable: false,
      });
    });

    let stepsExecuted = 0;
    let checkpointCount = 0;
    let anyFailed = false;

    for (let i = 0; i < input.steps.length; i += 1) {
      const step = input.steps[i];
      const planStep = planSteps[i];
      const stepId = planStep.id;

      if (
        input.checkpointBeforeRiskySteps !== false &&
        (planStep.riskLevel === "high" || planStep.riskLevel === "critical")
      ) {
        this.checkpoints.create({
          missionId: input.missionId,
          activePlanIndex: i,
          latestSuccessfulVerification:
            i > 0 ? `step-${i}-ok` : undefined,
          recoveryBranch: step.rollback,
        });
        checkpointCount += 1;
      }

      const success = step.simulateSuccess !== false;
      await this.recorder.appendStep(input.missionId, {
        stepId,
        goal: step.goal,
        status: success ? "executed" : "failed",
        notes: success
          ? step.expectedOutput || "scaffold executed"
          : "scaffold simulated failure",
      });

      await this.recorder.appendVerification(input.missionId, {
        stepId,
        passed: success,
        details: step.verification || (success ? "ok" : "failed"),
        verificationCommand: "mission-engine-scaffold",
      });

      // Mark receipt available on plan step after successful verify for completion gate.
      if (success) {
        planStep.receiptAvailable = true;
        planStep.verificationStatus = "passed";
        if (planStep.requiresRollback) planStep.rollbackAvailable = true;
      } else {
        anyFailed = true;
        planStep.verificationStatus = "failed";
      }
      stepsExecuted += 1;
    }

    const plan = createExecutionPlan({
      id: `plan:${input.missionId}`,
      summary: input.intent,
      steps: planSteps,
      actorTier: input.verificationOverride ? "origin" : "normal",
      rollbackPath: input.steps.find((s) => s.rollback)?.rollback,
    });

    const desiredStatus: MissionStatus = anyFailed ? "failed" : "completed";
    const completion = await finalizeMissionTapeWithVerification(this.recorder, {
      missionId: input.missionId,
      desiredStatus,
      plan,
      verificationOverride: input.verificationOverride,
      overrideReason: input.overrideReason,
      verificationContext: {
        intentClear: true,
        permissionGranted: true,
        capabilityAvailable: true,
        originReviewProvided: Boolean(input.verificationOverride),
        userConfirmationProvided: true,
        receiptAvailable: planSteps.every(
          (s) => s.receiptAvailable || s.riskLevel === "low",
        ),
        rollbackAvailable: planSteps.every(
          (s) => s.rollbackAvailable || !s.requiresRollback,
        ),
      },
      result: {
        success: !anyFailed && desiredStatus === "completed",
        status: desiredStatus,
        missionId: input.missionId,
        evidence: planSteps.map((s) => s.id),
        error: anyFailed ? "One or more scaffold steps failed." : undefined,
      },
    });

    const status = completion.tape.status;
    return {
      missionId: input.missionId,
      status,
      success: status === "completed" && !anyFailed,
      stepsExecuted,
      checkpoints: checkpointCount,
      completionBlocked: completion.blockedByVerification,
      reason: completion.reason,
      result: {
        success: status === "completed" && !anyFailed,
        status,
        missionId: input.missionId,
        evidence: planSteps.map((s) => s.id),
        error: completion.blockedByVerification
          ? completion.reason
          : anyFailed
            ? "One or more scaffold steps failed."
            : undefined,
      },
    };
  }
}

/** Map product MissionStep list into scaffold inputs. */
export function toScaffoldSteps(
  steps: MissionStep[],
): MissionEngineScaffoldStepInput[] {
  return steps.map((step) => ({
    stepId: step.stepId,
    goal: step.goal,
    toolOrRuntime: step.toolOrRuntime,
    expectedOutput: step.expectedOutput,
    verification: step.verification,
    rollback: step.rollback,
    riskLevel: step.riskLevel,
  }));
}
