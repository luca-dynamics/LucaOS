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
import { attachMissionTapeReceipt } from "../missionTape/attachMissionTapeReceipt";
import { finalizeMissionTapeWithVerification } from "../missionTape/missionTapeCompletionGate";
import {
  atomicUnitToExecutionStep,
  type AtomicOperationUnit,
  validateAtomicOperationUnit,
} from "./AtomicOperationUnit";
import { MissionCheckpointStore } from "./MissionCheckpointStore";
import { verifyBeforeStep } from "./preStepVerificationGate";
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
  /**
   * When provided, each unit is contract-validated and pre-step gated
   * before stub execution (Absorb Phase 1 atomic discipline).
   */
  atomicUnits?: AtomicOperationUnit[];
  /** Origin override for completion despite failed gates. */
  verificationOverride?: boolean;
  overrideReason?: string;
  checkpointBeforeRiskySteps?: boolean;
  /** Attach execution receipts after successful steps (default true). */
  attachReceipts?: boolean;
}

export interface MissionEngineScaffoldRunResult {
  missionId: string;
  status: MissionStatus;
  success: boolean;
  stepsExecuted: number;
  stepsBlockedPreflight: number;
  checkpoints: number;
  receiptsAttached: number;
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

    // Prefer strict atomic units when provided.
    const useAtomic =
      Array.isArray(input.atomicUnits) && input.atomicUnits.length > 0;
    const stepCount = useAtomic
      ? input.atomicUnits!.length
      : input.steps.length;

    const planSteps = useAtomic
      ? input.atomicUnits!.map((unit) => {
          const validated = validateAtomicOperationUnit(unit);
          if (!validated.ok || !validated.unit) {
            return createExecutionStep({
              id: `invalid-${Math.random().toString(36).slice(2, 7)}`,
              summary: "invalid atomic unit",
              kind: "unknown",
              riskLevel: "high",
            });
          }
          return atomicUnitToExecutionStep(validated.unit);
        })
      : input.steps.map((step, index) => {
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
    let stepsBlockedPreflight = 0;
    let checkpointCount = 0;
    let receiptsAttached = 0;
    let anyFailed = false;

    for (let i = 0; i < stepCount; i += 1) {
      const planStep = planSteps[i];
      const stepId = planStep.id;
      const step = useAtomic
        ? {
            goal: input.atomicUnits![i].goal,
            toolOrRuntime: input.atomicUnits![i].tool_or_runtime,
            expectedOutput: input.atomicUnits![i].expected_output,
            verification: input.atomicUnits![i].verification,
            rollback: input.atomicUnits![i].rollback,
            riskLevel: input.atomicUnits![i].risk_level,
            simulateSuccess: true as boolean | undefined,
          }
        : input.steps[i];

      if (useAtomic) {
        const pre = verifyBeforeStep({
          unit: input.atomicUnits![i],
          context: {
            intentClear: true,
            permissionGranted: true,
            capabilityAvailable: true,
            userConfirmationProvided: Boolean(input.verificationOverride),
            originReviewProvided: Boolean(input.verificationOverride),
            rollbackAvailable: Boolean(input.atomicUnits![i].rollback?.trim()),
            receiptAvailable: false,
          },
        });
        if (!pre.allowed && !input.verificationOverride) {
          stepsBlockedPreflight += 1;
          anyFailed = true;
          await this.recorder.appendStep(input.missionId, {
            stepId,
            goal: step.goal,
            status: "failed",
            notes: `pre-step blocked: ${pre.reason}`,
          });
          await this.recorder.appendVerification(input.missionId, {
            stepId,
            passed: false,
            details: pre.reason,
            verificationCommand: "preStepVerificationGate",
          });
          planStep.verificationStatus = "blocked";
          continue;
        }
      }

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

      if (success && input.attachReceipts !== false) {
        await attachMissionTapeReceipt(this.recorder, {
          missionId: input.missionId,
          stepId,
          summary: step.expectedOutput || step.goal,
          passed: true,
          evidence: [
            {
              kind: "manual_note",
              summary: step.verification || "scaffold step evidence",
            },
          ],
          source: "system",
        });
        receiptsAttached += 1;
      }

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
      rollbackPath:
        input.atomicUnits?.find((u) => u.rollback)?.rollback ||
        input.steps.find((s) => s.rollback)?.rollback,
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
      stepsBlockedPreflight,
      checkpoints: checkpointCount,
      receiptsAttached,
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
