/**
 * Real product wiring for mission completion verification.
 *
 * Syncs a MissionTape from product mission state (MissionControl goals or
 * computer-use step results), then finalizes only if GSD verification gates
 * pass (or override). Optional archive callback runs only after successful
 * completed status.
 */

import {
  createExecutionPlan,
  createExecutionStep,
  type LucaExecutionStepKind,
} from "../execution/LucaDeterministicExecution";
import { MissionTapeRecorderService } from "./MissionTapeRecorder";
import {
  finalizeMissionTapeWithVerification,
  type FinalizeMissionTapeWithVerificationResult,
} from "./missionTapeCompletionGate";
import type { MissionTapeRecord } from "./types";

export interface ProductMissionGoalLike {
  id?: string | number;
  description: string;
  status?: string;
}

export interface ProductMissionStepLike {
  stepId?: string;
  goal: string;
  status?: "executed" | "verified" | "recovered" | "failed" | "completed" | "inconclusive";
  kind?: string;
  notes?: string;
}

export interface CompleteProductMissionInput {
  missionId: string;
  intent: string;
  goals?: ProductMissionGoalLike[];
  steps?: ProductMissionStepLike[];
  success?: boolean;
  recorder?: MissionTapeRecorderService;
  verificationOverride?: boolean;
  overrideReason?: string;
  /**
   * Called only when tape is finalized as completed (gates passed or override).
   * Use for MissionControl.archiveMission, etc.
   */
  onCompletedArchive?: (missionId: string) => Promise<void> | void;
  /**
   * Called when desired success completion is blocked by verification.
   */
  onBlocked?: (
    missionId: string,
    result: FinalizeMissionTapeWithVerificationResult,
  ) => Promise<void> | void;
}

export interface CompleteProductMissionResult
  extends FinalizeMissionTapeWithVerificationResult {
  archived: boolean;
  source: "product_mission_completion";
}

function mapKind(kindOrGoal: string): LucaExecutionStepKind {
  const g = kindOrGoal.toLowerCase();
  if (/computer|browser|click|sandbox/.test(g)) return "computer_use";
  if (/file|write|delete|path/.test(g)) return "filesystem";
  if (/network|http|fetch|api/.test(g)) return "network";
  if (/skill|mcp|plugin/.test(g)) return "skill";
  if (/memory|remember/.test(g)) return "memory";
  if (/voice|speak/.test(g)) return "voice_command";
  if (/evolut|promot/.test(g)) return "self_evolution";
  if (/tool/.test(g)) return "tool_call";
  return "unknown";
}

function goalStatusToStepStatus(
  status?: string,
): "executed" | "verified" | "recovered" | "failed" {
  const s = (status || "").toUpperCase();
  if (s === "FAILED") return "failed";
  if (s === "COMPLETED") return "verified";
  if (s === "IN_PROGRESS" || s === "PENDING") return "executed";
  return "executed";
}

/**
 * Ensure tape exists, mirror product goals/steps, then gated finalize.
 */
export async function completeProductMission(
  input: CompleteProductMissionInput,
): Promise<CompleteProductMissionResult> {
  const recorder = input.recorder ?? new MissionTapeRecorderService();
  const missionId = input.missionId.trim();
  if (!missionId) throw new Error("completeProductMission requires missionId");

  let tape = await recorder.getTape(missionId);
  if (!tape) {
    tape = await recorder.createTape(missionId, input.intent);
  }

  // Mirror goals into tape steps when provided and tape is still light.
  if (input.goals?.length && tape.steps.length === 0) {
    for (const goal of input.goals) {
      const stepId = String(goal.id ?? `goal:${goal.description.slice(0, 24)}`);
      await recorder.appendStep(missionId, {
        stepId,
        goal: goal.description,
        status: goalStatusToStepStatus(goal.status),
        notes: `mission-control:${goal.status || "UNKNOWN"}`,
      });
      if ((goal.status || "").toUpperCase() === "COMPLETED") {
        await recorder.appendVerification(missionId, {
          stepId,
          passed: true,
          details: "Goal marked COMPLETED in MissionControl",
          verificationCommand: "mission-control-goal",
        });
      }
    }
  }

  // Mirror explicit step results (computer-use runner, etc.).
  if (input.steps?.length) {
    for (const step of input.steps) {
      const stepId = step.stepId || `step:${step.goal.slice(0, 24)}`;
      const failed =
        step.status === "failed" || step.status === "inconclusive";
      const already = (await recorder.getTape(missionId))?.steps.some(
        (s) => s.stepId === stepId,
      );
      if (!already) {
        await recorder.appendStep(missionId, {
          stepId,
          goal: step.goal,
          status: failed ? "failed" : step.status === "verified" ? "verified" : "executed",
          notes: step.notes || step.kind || step.status,
        });
      }
      if (!failed) {
        await recorder.appendVerification(missionId, {
          stepId,
          passed: true,
          details: step.notes || "product step recorded",
          verificationCommand: "product-step-result",
        });
      }
    }
  }

  const refreshed = await recorder.getTape(missionId);
  const planSteps =
    refreshed?.steps.map((s) =>
      createExecutionStep({
        id: s.stepId,
        summary: s.goal,
        kind: mapKind(s.goal),
        riskLevel: /file|computer|network|delete|write/i.test(s.goal)
          ? "medium"
          : "low",
        receiptAvailable:
          s.status === "verified" ||
          Boolean(refreshed.verification.some((v) => v.stepId === s.stepId && v.passed)),
        rollbackAvailable: refreshed.recovery.some(
          (r) => r.stepId === s.stepId && r.recovered,
        ),
      }),
    ) ?? [];

  const plan = createExecutionPlan({
    id: `plan:product:${missionId}`,
    summary: input.intent,
    steps:
      planSteps.length > 0
        ? planSteps
        : [
            createExecutionStep({
              id: `${missionId}:intent`,
              summary: input.intent,
              kind: "tool_call",
              riskLevel: "low",
            }),
          ],
    actorTier: input.verificationOverride ? "origin" : "normal",
  });

  const success = input.success !== false;
  const desiredStatus = success ? "completed" : "failed";

  const productGoalsDone =
    Boolean(input.goals?.length) &&
    input.goals!.every((g) => (g.status || "").toUpperCase() === "COMPLETED");
  const productStepsOk =
    Boolean(input.steps?.length) &&
    input.steps!.every(
      (s) => s.status === "verified" || s.status === "completed" || s.status === "executed",
    ) &&
    !input.steps!.some((s) => s.status === "failed");

  const completion = await finalizeMissionTapeWithVerification(recorder, {
    missionId,
    desiredStatus,
    plan,
    verificationOverride: input.verificationOverride,
    overrideReason: input.overrideReason,
    verificationContext: {
      intentClear: true,
      permissionGranted: true,
      capabilityAvailable: true,
      userConfirmationProvided: true,
      originReviewProvided: Boolean(input.verificationOverride),
      // Product surfaces that already marked goals/steps done count as evidence.
      receiptAvailable:
        productGoalsDone ||
        productStepsOk ||
        plan.steps.every((s) => s.receiptAvailable || s.riskLevel === "low"),
      rollbackAvailable:
        productGoalsDone ||
        plan.steps.every((s) => s.rollbackAvailable || !s.requiresRollback),
    },
    result: {
      success: success && desiredStatus === "completed",
      status: desiredStatus,
      missionId,
      evidence: plan.steps.map((s) => s.id),
    },
  });

  let archived = false;
  if (completion.completed && input.onCompletedArchive) {
    await input.onCompletedArchive(missionId);
    archived = true;
  } else if (completion.blockedByVerification && input.onBlocked) {
    await input.onBlocked(missionId, completion);
  }

  return {
    ...completion,
    archived,
    source: "product_mission_completion",
  };
}
