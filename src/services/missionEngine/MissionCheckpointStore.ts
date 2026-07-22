/**
 * Absorb Phase 1 — checkpoint / rollback representation for missions.
 * In-memory store; no host mutation. Product code can attach checkpoints
 * before risky steps and restore index after recovery.
 */

import type { MissionCheckpoint } from "./types";

export interface CreateMissionCheckpointInput {
  missionId: string;
  activePlanIndex: number;
  toolRuntimeContext?: Record<string, unknown>;
  relevantStateSnapshots?: Record<string, unknown>;
  modelRoute?: string;
  latestSuccessfulVerification?: string;
  recoveryBranch?: string;
  checkpointId?: string;
  createdAt?: string;
}

export class MissionCheckpointStore {
  private readonly byMission = new Map<string, MissionCheckpoint[]>();

  create(input: CreateMissionCheckpointInput): MissionCheckpoint {
    const checkpoint: MissionCheckpoint = {
      checkpointId:
        input.checkpointId?.trim() ||
        `cp:${input.missionId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      missionId: input.missionId,
      activePlanIndex: input.activePlanIndex,
      toolRuntimeContext: input.toolRuntimeContext,
      relevantStateSnapshots: input.relevantStateSnapshots,
      modelRoute: input.modelRoute,
      latestSuccessfulVerification: input.latestSuccessfulVerification,
      recoveryBranch: input.recoveryBranch,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    const list = this.byMission.get(input.missionId) ?? [];
    list.push(checkpoint);
    this.byMission.set(input.missionId, list);
    return checkpoint;
  }

  list(missionId: string): MissionCheckpoint[] {
    return [...(this.byMission.get(missionId) ?? [])];
  }

  latest(missionId: string): MissionCheckpoint | null {
    const list = this.byMission.get(missionId);
    if (!list || list.length === 0) return null;
    return list[list.length - 1] ?? null;
  }

  /**
   * Restore plan index from a checkpoint (representation only).
   * Returns the checkpoint activePlanIndex for the caller to apply.
   */
  restorePlanIndex(
    missionId: string,
    checkpointId?: string,
  ): { ok: boolean; activePlanIndex?: number; checkpoint?: MissionCheckpoint; reason?: string } {
    const list = this.byMission.get(missionId) ?? [];
    if (list.length === 0) {
      return { ok: false, reason: "No checkpoints for mission." };
    }
    const checkpoint = checkpointId
      ? list.find((c) => c.checkpointId === checkpointId)
      : list[list.length - 1];
    if (!checkpoint) {
      return { ok: false, reason: `Checkpoint not found: ${checkpointId}` };
    }
    return {
      ok: true,
      activePlanIndex: checkpoint.activePlanIndex,
      checkpoint,
    };
  }

  clear(missionId?: string): void {
    if (missionId) this.byMission.delete(missionId);
    else this.byMission.clear();
  }
}

export const missionCheckpointStore = new MissionCheckpointStore();
