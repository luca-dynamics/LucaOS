/**
 * Absorb Phase 1 pilot — Mission Engine completion criteria.
 *
 * From MISSION_ENGINE_SPEC:
 * A mission can be marked complete only when deterministic verification
 * passes OR an approved override exists (and the tape is recorded).
 *
 * This does not execute live actions. It gates *completion status* on
 * GSD-style verification helpers already in services/execution.
 */

import {
  createExecutionPlan,
  createExecutionStep,
  type LucaExecutionPlan,
  type LucaExecutionStepKind,
} from "../execution/LucaDeterministicExecution";
import {
  getExecutionVerificationGateSnapshot,
  type LucaExecutionVerificationContext,
  type LucaExecutionVerificationGateSnapshot,
} from "../execution/LucaExecutionVerificationGate";
import type { MissionTapeRecorderService } from "./MissionTapeRecorder";
import type { MissionTapeRecord } from "./types";

export interface FinalizeMissionTapeWithVerificationInput {
  missionId: string;
  desiredStatus: MissionTapeRecord["status"];
  result?: MissionTapeRecord["result"];
  completedAt?: string;
  /** Explicit execution plan; if omitted, a plan is inferred from the tape. */
  plan?: LucaExecutionPlan;
  verificationContext?: LucaExecutionVerificationContext;
  /**
   * Allow "completed" despite failed gates (Origin / explicit product override).
   * Still records verification rows so the tape stays honest.
   */
  verificationOverride?: boolean;
  overrideReason?: string;
}

export interface FinalizeMissionTapeWithVerificationResult {
  ok: boolean;
  completed: boolean;
  /** True when completion as success was refused due to gates. */
  blockedByVerification: boolean;
  tape: MissionTapeRecord;
  gateSnapshot: LucaExecutionVerificationGateSnapshot;
  reason?: string;
}

function mapStepKind(goal: string, status: string): LucaExecutionStepKind {
  const g = `${goal} ${status}`.toLowerCase();
  if (/computer|browser|click|type|sandbox/.test(g)) return "computer_use";
  if (/file|write|delete|path/.test(g)) return "filesystem";
  if (/network|http|fetch|api/.test(g)) return "network";
  if (/skill|mcp|plugin/.test(g)) return "skill";
  if (/memory|remember/.test(g)) return "memory";
  if (/voice|speak|listen/.test(g)) return "voice_command";
  if (/evolut|promot/.test(g)) return "self_evolution";
  if (/tool/.test(g)) return "tool_call";
  return "unknown";
}

/**
 * Build a representation-only execution plan from an existing mission tape.
 */
export function buildExecutionPlanFromMissionTape(
  tape: MissionTapeRecord,
): LucaExecutionPlan {
  const steps =
    tape.steps.length > 0
      ? tape.steps.map((step, index) =>
          createExecutionStep({
            id: step.stepId || `tape-step-${index}`,
            summary: step.goal || `Mission step ${index + 1}`,
            kind: mapStepKind(step.goal, step.status),
            verificationStatus:
              step.status === "verified"
                ? "passed"
                : step.status === "failed"
                  ? "failed"
                  : "pending",
            // Tape-level evidence: treat prior verification rows as receipts when present.
            receiptAvailable: tape.verification.some(
              (v) => v.stepId === step.stepId && v.passed,
            ),
            rollbackAvailable: tape.recovery.some(
              (r) => r.stepId === step.stepId && r.recovered,
            ),
          }),
        )
      : [
          createExecutionStep({
            id: `${tape.missionId}:intent`,
            summary: tape.intent || "Mission intent",
            kind: "tool_call",
            riskLevel: "low",
            receiptAvailable: tape.verification.some((v) => v.passed),
          }),
        ];

  return createExecutionPlan({
    id: `plan:${tape.missionId}`,
    summary: tape.intent || `Mission ${tape.missionId}`,
    steps,
    actorTier: "normal",
  });
}

/**
 * Finalize a mission tape only as "completed" when verification gates pass
 * (or verificationOverride is set). Other statuses always finalize.
 */
export async function finalizeMissionTapeWithVerification(
  recorder: MissionTapeRecorderService,
  input: FinalizeMissionTapeWithVerificationInput,
): Promise<FinalizeMissionTapeWithVerificationResult> {
  const tape = await recorder.getTape(input.missionId);
  if (!tape) {
    throw new Error(`Mission tape not found: ${input.missionId}`);
  }

  const plan = input.plan ?? buildExecutionPlanFromMissionTape(tape);
  const gateSnapshot = getExecutionVerificationGateSnapshot({
    plan,
    context: {
      intentClear: true,
      permissionGranted: true,
      capabilityAvailable: true,
      // Prefer context; fall back to tape evidence.
      receiptAvailable:
        input.verificationContext?.receiptAvailable ??
        (tape.verification.some((v) => v.passed) ||
          plan.steps.every(
            (s) => s.receiptAvailable || s.riskLevel === "low",
          )),
      rollbackAvailable:
        input.verificationContext?.rollbackAvailable ??
        (tape.recovery.some((r) => r.recovered) ||
          plan.steps.every(
            (s) => s.rollbackAvailable || !s.requiresRollback,
          )),
      ...input.verificationContext,
    },
  });

  // Always append a verification summary row for auditability.
  const details = gateSnapshot.results
    .filter((r) => !r.ok || r.status === "warning")
    .map((r) => `${r.gate}:${r.status}${r.reason ? ` (${r.reason})` : ""}`)
    .join("; ");

  await recorder.appendVerification(input.missionId, {
    stepId: "mission-completion-gate",
    passed: gateSnapshot.summary.ok,
    details:
      details ||
      (gateSnapshot.summary.ok
        ? "All completion verification gates passed."
        : "Completion verification gates did not pass."),
    verificationCommand: "finalizeMissionTapeWithVerification",
  });

  const wantsComplete = input.desiredStatus === "completed";
  const canComplete =
    !wantsComplete ||
    gateSnapshot.summary.ok ||
    Boolean(input.verificationOverride);

  if (wantsComplete && !canComplete) {
    const refreshed = await recorder.getTape(input.missionId);
    return {
      ok: false,
      completed: false,
      blockedByVerification: true,
      tape: refreshed ?? tape,
      gateSnapshot,
      reason:
        "Mission cannot be marked complete until verification gates pass or an approved override is provided.",
    };
  }

  if (input.verificationOverride && wantsComplete && !gateSnapshot.summary.ok) {
    await recorder.appendVerification(input.missionId, {
      stepId: "mission-completion-override",
      passed: true,
      details:
        input.overrideReason ||
        "Completion override applied despite incomplete verification gates.",
      verificationCommand: "finalizeMissionTapeWithVerification.override",
    });
  }

  const finalStatus =
    wantsComplete && !gateSnapshot.summary.ok && input.verificationOverride
      ? "completed"
      : input.desiredStatus;

  const finalized = await recorder.finalizeTape(input.missionId, {
    status: finalStatus,
    result: input.result,
    completedAt: input.completedAt,
  });

  return {
    ok: true,
    completed: finalStatus === "completed",
    blockedByVerification: false,
    tape: finalized,
    gateSnapshot,
    reason: input.verificationOverride
      ? "Completed with verification override."
      : gateSnapshot.summary.ok
        ? "Completed after verification gates passed."
        : `Finalized as ${finalStatus}.`,
  };
}
