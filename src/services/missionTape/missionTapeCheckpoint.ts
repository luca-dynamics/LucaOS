/**
 * Absorb Phase 1 pilot — mission checkpoint / rollback on the tape.
 *
 * Representation-only: records checkpoints and rollback intent on the mission
 * tape so verification gates can see rollbackAvailable. Does not restore host
 * filesystem or reverse live side-effects.
 */

import type { MissionTapeRecorderService } from "./MissionTapeRecorder";
import { sharedMissionTapeRecorder } from "./sharedMissionTapeRecorder";
import type { MissionTapeRecord } from "./types";

export interface MissionCheckpointGoalSnapshot {
  id?: string | number;
  description: string;
  status?: string;
}

export interface MissionCheckpointRecord {
  checkpointId: string;
  missionId: string;
  label: string;
  /** Number of non-checkpoint steps present when the checkpoint was taken. */
  stepCount: number;
  goals?: MissionCheckpointGoalSnapshot[];
  timestamp: string;
}

export interface RecordMissionCheckpointInput {
  missionId: string;
  intent?: string;
  label?: string;
  goals?: MissionCheckpointGoalSnapshot[];
  recorder?: MissionTapeRecorderService;
}

export interface RecordMissionCheckpointResult {
  ok: boolean;
  checkpointId: string;
  tape: MissionTapeRecord;
}

export interface RecordMissionRollbackInput {
  missionId: string;
  /** Defaults to the latest checkpoint on the tape. */
  checkpointId?: string;
  reason?: string;
  recorder?: MissionTapeRecorderService;
}

export interface RecordMissionRollbackResult {
  ok: boolean;
  recovered: boolean;
  checkpointId?: string;
  reason?: string;
  tape?: MissionTapeRecord;
}

const CHECKPOINT_PREFIX = "checkpoint:";

function isCheckpointStepId(stepId: string): boolean {
  return stepId.startsWith(CHECKPOINT_PREFIX);
}

/**
 * List checkpoints recorded on a tape (oldest → newest).
 */
export function listMissionCheckpoints(
  tape: MissionTapeRecord | null | undefined,
): MissionCheckpointRecord[] {
  if (!tape?.steps?.length) return [];
  const out: MissionCheckpointRecord[] = [];
  for (const step of tape.steps) {
    if (!isCheckpointStepId(step.stepId)) continue;
    const checkpointId = step.stepId.slice(CHECKPOINT_PREFIX.length) || step.stepId;
    let goals: MissionCheckpointGoalSnapshot[] | undefined;
    let stepCount = 0;
    if (step.notes) {
      try {
        const parsed = JSON.parse(step.notes) as {
          goals?: MissionCheckpointGoalSnapshot[];
          stepCount?: number;
        };
        if (Array.isArray(parsed.goals)) goals = parsed.goals;
        if (typeof parsed.stepCount === "number") stepCount = parsed.stepCount;
      } catch {
        /* plain notes */
      }
    }
    out.push({
      checkpointId,
      missionId: tape.missionId,
      label: step.goal || `Checkpoint ${checkpointId}`,
      stepCount,
      goals,
      timestamp: step.timestamp,
    });
  }
  return out;
}

export function getLatestMissionCheckpoint(
  tape: MissionTapeRecord | null | undefined,
): MissionCheckpointRecord | undefined {
  const list = listMissionCheckpoints(tape);
  return list[list.length - 1];
}

/**
 * Ensure tape exists and append a checkpoint step + recovery marker (available).
 */
export async function recordMissionCheckpoint(
  input: RecordMissionCheckpointInput,
): Promise<RecordMissionCheckpointResult> {
  const recorder = input.recorder ?? sharedMissionTapeRecorder;
  const missionId = input.missionId.trim();
  if (!missionId) throw new Error("recordMissionCheckpoint requires missionId");

  let tape = await recorder.getTape(missionId);
  if (!tape) {
    tape = await recorder.createTape(
      missionId,
      input.intent?.trim() || `mission:${missionId}`,
    );
  }

  const checkpointId = `cp-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
  const label =
    input.label?.trim() ||
    `Checkpoint after ${tape.steps.length} step(s)`;
  const stepCount = tape.steps.filter((s) => !isCheckpointStepId(s.stepId))
    .length;
  const notes = JSON.stringify({
    kind: "mission_checkpoint",
    stepCount,
    goals: (input.goals ?? []).map((g) => ({
      id: g.id,
      description: g.description,
      status: g.status,
    })),
  });

  await recorder.appendStep(missionId, {
    stepId: `${CHECKPOINT_PREFIX}${checkpointId}`,
    goal: label,
    status: "executed",
    notes,
  });

  // Recovery row: checkpoint establishes a restore point (rollbackAvailable).
  await recorder.appendRecovery(missionId, {
    stepId: `${CHECKPOINT_PREFIX}${checkpointId}`,
    recovered: true,
    reason: "checkpoint_recorded",
    details: label,
  });

  const refreshed = await recorder.getTape(missionId);
  return {
    ok: true,
    checkpointId,
    tape: refreshed ?? tape,
  };
}

/**
 * Record rollback intent to a checkpoint on the tape (does not reverse live effects).
 */
export async function recordMissionRollback(
  input: RecordMissionRollbackInput,
): Promise<RecordMissionRollbackResult> {
  const recorder = input.recorder ?? sharedMissionTapeRecorder;
  const missionId = input.missionId.trim();
  if (!missionId) throw new Error("recordMissionRollback requires missionId");

  const tape = await recorder.getTape(missionId);
  if (!tape) {
    return {
      ok: false,
      recovered: false,
      reason: "Mission tape not found — create a checkpoint first.",
    };
  }

  const checkpoints = listMissionCheckpoints(tape);
  const target = input.checkpointId
    ? checkpoints.find((c) => c.checkpointId === input.checkpointId)
    : checkpoints[checkpoints.length - 1];

  if (!target) {
    return {
      ok: false,
      recovered: false,
      reason: input.checkpointId
        ? `Checkpoint not found: ${input.checkpointId}`
        : "No checkpoints on tape — record a checkpoint first.",
      tape,
    };
  }

  const reason =
    input.reason?.trim() ||
    `Operator rollback to checkpoint ${target.checkpointId}`;

  await recorder.appendRecovery(missionId, {
    stepId: `${CHECKPOINT_PREFIX}${target.checkpointId}`,
    recovered: true,
    reason: "rollback_to_checkpoint",
    details: reason,
  });

  await recorder.appendStep(missionId, {
    stepId: `rollback:${target.checkpointId}:${Date.now().toString(36)}`,
    goal: `Rollback to ${target.label}`,
    status: "recovered",
    notes: reason,
  });

  const refreshed = await recorder.getTape(missionId);
  return {
    ok: true,
    recovered: true,
    checkpointId: target.checkpointId,
    reason,
    tape: refreshed ?? tape,
  };
}
