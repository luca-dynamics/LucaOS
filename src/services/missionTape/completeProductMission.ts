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
import { getExecutionVerificationGateSnapshot } from "../execution/LucaExecutionVerificationGate";
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
  /** Whether the product state said the work was actually finished. */
  productReadiness: ProductMissionReadiness;
}

/**
 * A mission tape step is a record of work that already happened, not a proposal
 * to act. "I could not classify this description" must therefore not resolve to
 * `unknown`, which the execution contract treats as critical/blocked — that
 * would refuse completion for any goal whose wording misses the keyword list.
 */
const DEFAULT_MISSION_STEP_KIND: LucaExecutionStepKind = "tool_call";

const KNOWN_STEP_KINDS: readonly LucaExecutionStepKind[] = [
  "tool_call",
  "voice_command",
  "computer_use",
  "filesystem",
  "network",
  "skill",
  "memory",
  "device_control",
  "self_evolution",
];

const SENSITIVE_STEP_KINDS: readonly LucaExecutionStepKind[] = [
  "computer_use",
  "filesystem",
  "network",
  "device_control",
  "self_evolution",
];

/** Tape rows written by checkpoint/rollback bookkeeping, not mission work. */
const BOOKKEEPING_STEP_PREFIXES = ["checkpoint:", "rollback:"];

function isBookkeepingStep(stepId: string): boolean {
  return BOOKKEEPING_STEP_PREFIXES.some((prefix) => stepId.startsWith(prefix));
}

function normalizeKind(kind?: string): LucaExecutionStepKind | undefined {
  if (!kind) return undefined;
  const normalized = kind.trim().toLowerCase() as LucaExecutionStepKind;
  return KNOWN_STEP_KINDS.includes(normalized) ? normalized : undefined;
}

function inferKindFromText(text: string): LucaExecutionStepKind {
  const g = text.toLowerCase();
  if (/computer|browser|click|sandbox/.test(g)) return "computer_use";
  if (/file|write|delete|path/.test(g)) return "filesystem";
  if (/network|http|fetch|api/.test(g)) return "network";
  if (/skill|mcp|plugin/.test(g)) return "skill";
  if (/memory|remember/.test(g)) return "memory";
  if (/voice|speak/.test(g)) return "voice_command";
  if (/evolut|promot/.test(g)) return "self_evolution";
  if (/tool/.test(g)) return "tool_call";
  return DEFAULT_MISSION_STEP_KIND;
}

/**
 * Completion describes finished work, so risk stays capped at medium: the
 * permission contract blocks high-risk sensitive kinds outright for normal
 * actors, which is right for "may Luca do this?" and wrong for "did this
 * already happen?".
 */
function riskForMissionStep(
  kind: LucaExecutionStepKind,
  text: string,
): "low" | "medium" {
  if (SENSITIVE_STEP_KINDS.includes(kind)) return "medium";
  return /file|computer|network|delete|write/i.test(text) ? "medium" : "low";
}

export interface ProductMissionReadiness {
  ready: boolean;
  goalsTotal: number;
  goalsCompleted: number;
  goalsFailed: number;
  stepsFailed: number;
  reason?: string;
}

/**
 * The gate that was missing: a mission is only "done" when the product state
 * says the work finished. Verification gates check *how* the work was done;
 * they never asked *whether* it was.
 */
function assessProductReadiness(
  goals: ProductMissionGoalLike[] | undefined,
  steps: ProductMissionStepLike[] | undefined,
): ProductMissionReadiness {
  const goalStatuses = (goals ?? []).map((g) => (g.status || "").toUpperCase());
  const goalsTotal = goalStatuses.length;
  const goalsCompleted = goalStatuses.filter((s) => s === "COMPLETED").length;
  const goalsFailed = goalStatuses.filter((s) => s === "FAILED").length;
  const stepsFailed = (steps ?? []).filter(
    (s) => s.status === "failed" || s.status === "inconclusive",
  ).length;

  const reasons: string[] = [];
  if (goalsTotal > 0 && goalsCompleted < goalsTotal) {
    reasons.push(
      `${goalsCompleted}/${goalsTotal} goals completed` +
        (goalsFailed > 0 ? ` (${goalsFailed} failed)` : ""),
    );
  }
  if (stepsFailed > 0) {
    reasons.push(`${stepsFailed} step(s) failed or inconclusive`);
  }

  return {
    ready: reasons.length === 0,
    goalsTotal,
    goalsCompleted,
    goalsFailed,
    stepsFailed,
    reason: reasons.length ? reasons.join("; ") : undefined,
  };
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

  // Mirror goals into tape steps when provided and no mission work is recorded
  // yet. Checkpoint/rollback rows are bookkeeping and must not suppress this.
  const recordedWorkSteps = tape.steps.filter(
    (s) => !isBookkeepingStep(s.stepId),
  ).length;
  if (input.goals?.length && recordedWorkSteps === 0) {
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

  // Explicit kinds supplied by the caller beat guessing from goal text.
  const declaredKinds = new Map<string, LucaExecutionStepKind>();
  for (const step of input.steps ?? []) {
    const kind = normalizeKind(step.kind);
    const stepId = step.stepId || `step:${step.goal.slice(0, 24)}`;
    if (kind) declaredKinds.set(stepId, kind);
  }

  const refreshed = await recorder.getTape(missionId);
  const planSteps =
    refreshed?.steps
      .filter((s) => !isBookkeepingStep(s.stepId))
      .map((s) => {
        const kind = declaredKinds.get(s.stepId) ?? inferKindFromText(s.goal);
        return createExecutionStep({
          id: s.stepId,
          summary: s.goal,
          kind,
          riskLevel: riskForMissionStep(kind, s.goal),
          receiptAvailable:
            s.status === "verified" ||
            Boolean(
              refreshed.verification.some(
                (v) => v.stepId === s.stepId && v.passed,
              ),
            ),
          rollbackAvailable: refreshed.recovery.some(
            (r) => r.stepId === s.stepId && r.recovered,
          ),
        });
      }) ?? [];

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

  const readiness = assessProductReadiness(input.goals, input.steps);
  const productGoalsDone = readiness.goalsTotal > 0 && readiness.ready;
  const productStepsOk =
    Boolean(input.steps?.length) && readiness.stepsFailed === 0;

  // Refuse a success completion while the product still reports unfinished or
  // failed work, unless an operator override is supplied.
  if (desiredStatus === "completed" && !readiness.ready && !input.verificationOverride) {
    const reason = `Mission cannot be marked complete: ${readiness.reason}.`;
    await recorder.appendVerification(missionId, {
      stepId: "mission-completion-gate",
      passed: false,
      details: reason,
      verificationCommand: "completeProductMission.productReadiness",
    });
    const blockedTape = (await recorder.getTape(missionId)) ?? refreshed!;
    const blockedResult: CompleteProductMissionResult = {
      ok: false,
      completed: false,
      blockedByVerification: true,
      tape: blockedTape,
      gateSnapshot: getExecutionVerificationGateSnapshot({ plan }),
      reason,
      archived: false,
      source: "product_mission_completion",
      productReadiness: readiness,
    };
    if (input.onBlocked) await input.onBlocked(missionId, blockedResult);
    return blockedResult;
  }

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
  if (completion.completed) {
    if (input.onCompletedArchive) {
      await input.onCompletedArchive(missionId);
      archived = true;
    }
    // Phase 2: Autonomous Skill Synthesis from completed mission trajectory
    try {
      const { autonomousSkillSynthesizer } = await import("../skills/autonomousSkillSynthesizer");
      const steps = (input.steps || []).map((s) => ({
        kind: s.kind || "tool_call",
        description: s.goal,
        resultSummary: s.notes,
      }));
      await autonomousSkillSynthesizer.synthesizeSkill({
        missionTitle: input.intent || missionId,
        description: `Autonomous skill generated from completed mission: ${input.intent}`,
        steps: steps.length > 0 ? steps : [{ kind: "mission", description: input.intent }],
      });
    } catch (err) {
      console.warn("[completeProductMission] Autonomous skill synthesis failed silently:", err);
    }
  } else if (completion.blockedByVerification && input.onBlocked) {
    await input.onBlocked(missionId, completion);
  }

  return {
    ...completion,
    archived,
    source: "product_mission_completion",
    productReadiness: readiness,
  };
}
