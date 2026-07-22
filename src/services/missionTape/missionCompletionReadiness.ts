/**
 * Pre-flight completion readiness for Mission Center (and product callers).
 * Pure assessment — does not mutate tape or call Electron.
 */

import type { MissionGoal } from "../agent/MissionControlService";
import type { MissionTapeRecord } from "./types";
import type { LucaExecutionVerificationGateSnapshot } from "../execution/LucaExecutionVerificationGate";

export interface MissionCompletionReadiness {
  /** Product-side goals all COMPLETED with none FAILED. */
  goalsReady: boolean;
  goalsTotal: number;
  goalsCompleted: number;
  goalsFailed: number;
  goalsInProgress: number;
  goalsPending: number;
  hasTape: boolean;
  tapeSteps: number;
  tapeVerificationsPassed: number;
  tapeVerificationsFailed: number;
  /**
   * Operator-facing blockers that make "Complete with verification"
   * unlikely to succeed without override (or finishing goals first).
   */
  blockers: string[];
  /** Positive signals already present. */
  signals: string[];
  /**
   * True when goalsReady and no hard goal blockers.
   * Full GSD gates still run at complete time.
   */
  likelyCompletable: boolean;
}

export function assessMissionCompletionReadiness(input: {
  goals?: Array<Pick<MissionGoal, "status" | "description">>;
  tape?: MissionTapeRecord | null;
}): MissionCompletionReadiness {
  const goals = input.goals ?? [];
  const goalsTotal = goals.length;
  const goalsCompleted = goals.filter((g) => g.status === "COMPLETED").length;
  const goalsFailed = goals.filter((g) => g.status === "FAILED").length;
  const goalsInProgress = goals.filter((g) => g.status === "IN_PROGRESS").length;
  const goalsPending = goals.filter((g) => g.status === "PENDING").length;

  const tape = input.tape ?? null;
  const hasTape = Boolean(tape);
  const tapeSteps = tape?.steps.length ?? 0;
  const tapeVerificationsPassed =
    tape?.verification.filter((v) => v.passed).length ?? 0;
  const tapeVerificationsFailed =
    tape?.verification.filter((v) => !v.passed).length ?? 0;

  const blockers: string[] = [];
  const signals: string[] = [];

  if (goalsTotal === 0) {
    blockers.push("No goals yet — add goals or let workforce/computer-use attach them.");
  } else {
    if (goalsCompleted === goalsTotal) {
      signals.push(`All ${goalsTotal} goal(s) COMPLETED.`);
    } else {
      if (goalsPending > 0) {
        blockers.push(`${goalsPending} goal(s) still PENDING.`);
      }
      if (goalsInProgress > 0) {
        blockers.push(`${goalsInProgress} goal(s) still IN_PROGRESS.`);
      }
      if (goalsFailed > 0) {
        blockers.push(
          `${goalsFailed} goal(s) FAILED — mark failed mission or fix goals before complete.`,
        );
      }
      const remaining = goalsTotal - goalsCompleted - goalsFailed;
      if (remaining > 0 && goalsPending === 0 && goalsInProgress === 0) {
        blockers.push(`${remaining} goal(s) not COMPLETED.`);
      }
    }
  }

  if (hasTape) {
    const recoveryCount = tape?.recovery.length ?? 0;
    signals.push(
      `Tape: ${tapeSteps} step(s), ${tapeVerificationsPassed} verification(s) passed` +
        (recoveryCount > 0 ? `, ${recoveryCount} recovery/checkpoint row(s)` : "") +
        ".",
    );
    if (tapeVerificationsFailed > 0) {
      blockers.push(
        `${tapeVerificationsFailed} tape verification row(s) failed (may block unless override).`,
      );
    }
  } else {
    signals.push("No tape yet — first gated complete will create one.");
  }

  const goalsReady =
    goalsTotal > 0 && goalsCompleted === goalsTotal && goalsFailed === 0;

  // Failed goals are a hard product blocker; open goals are soft until complete.
  const likelyCompletable = goalsReady && goalsFailed === 0;

  return {
    goalsReady,
    goalsTotal,
    goalsCompleted,
    goalsFailed,
    goalsInProgress,
    goalsPending,
    hasTape,
    tapeSteps,
    tapeVerificationsPassed,
    tapeVerificationsFailed,
    blockers,
    signals,
    likelyCompletable,
  };
}

/**
 * Flatten gate snapshot into short operator-facing lines (blocked/warning first).
 */
export function formatGateSnapshotLines(
  snapshot: LucaExecutionVerificationGateSnapshot | undefined | null,
  max = 8,
): string[] {
  if (!snapshot?.results?.length) return [];
  const interesting = [
    ...snapshot.results.filter((r) => !r.ok || r.status === "blocked"),
    ...snapshot.results.filter((r) => r.ok && r.status === "warning"),
  ];
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const r of interesting) {
    const line = `${r.gate}: ${r.status}${r.reason ? ` — ${r.reason}` : ""}`;
    if (seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
    if (lines.length >= max) break;
  }
  if (lines.length === 0 && snapshot.summary) {
    lines.push(
      snapshot.summary.ok
        ? "All verification gates passed."
        : "Verification gates did not pass.",
    );
  }
  return lines;
}
