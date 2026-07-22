/**
 * Link computer-use runSteps mission ids to MissionControl when the bridge
 * is available. Soft-fails on web. Complements workforce mission attach.
 *
 * When steps are provided, adds one MissionControl goal per step (workforce
 * parity) so Mission Center shows live CU progress.
 */

import { missionControlService } from "../agent/MissionControlService";

export interface EnsureComputerUseMissionControlResult {
  linked: boolean;
  missionControlId?: number;
  /** stepId → MissionControl goal id */
  stepGoalIds?: Record<string, number>;
  reason?: string;
}

export interface ComputerUseStepGoalRef {
  stepId: string;
  description?: string;
}

/**
 * Ensure a MissionControl mission exists for a computer-use run.
 * - If missionId is numeric and matches the active mission, reuse it.
 * - Otherwise start a new MissionControl mission titled from the CU mission id.
 * - When `steps` is provided, add one goal per step and return the map.
 */
export async function ensureComputerUseMissionControl(
  missionId: string,
  options?: {
    intent?: string;
    steps?: ComputerUseStepGoalRef[];
    hasBridge?: () => boolean;
    startMission?: typeof missionControlService.startMission;
    getActiveMission?: typeof missionControlService.getActiveMission;
    addGoal?: typeof missionControlService.addGoal;
  },
): Promise<EnsureComputerUseMissionControlResult> {
  const hasBridge =
    options?.hasBridge ??
    (() =>
      typeof window !== "undefined" &&
      Boolean(window.luca?.missionControl?.start));

  if (!hasBridge()) {
    return { linked: false, reason: "MissionControl bridge unavailable" };
  }

  const start =
    options?.startMission?.bind(missionControlService) ??
    ((title: string, metadata?: unknown) =>
      missionControlService.startMission(title, metadata));
  const getActive =
    options?.getActiveMission?.bind(missionControlService) ??
    (() => missionControlService.getActiveMission());
  const addGoal =
    options?.addGoal?.bind(missionControlService) ??
    ((mid: number, description: string) =>
      missionControlService.addGoal(mid, description));

  let missionControlId: number | undefined;

  const numeric = Number(missionId);
  if (Number.isFinite(numeric) && String(numeric) === missionId.trim()) {
    const active = await getActive();
    if (active?.mission.id === numeric) {
      missionControlId = numeric;
    }
    // Prefer existing active only if ids match; otherwise start titled mission.
  }

  if (missionControlId == null) {
    const intent =
      options?.intent?.trim() || `computer-use:${missionId}`;
    missionControlId = await start(intent, {
      source: "computer_use",
      computerUseMissionId: missionId,
    });
  }

  const stepGoalIds: Record<string, number> = {};
  const steps = options?.steps ?? [];
  for (const step of steps) {
    if (!step.stepId || stepGoalIds[step.stepId] != null) continue;
    const description =
      step.description?.trim() || `computer_use:${step.stepId}`;
    const goalId = await addGoal(missionControlId, description);
    stepGoalIds[step.stepId] = goalId;
  }

  return {
    linked: true,
    missionControlId,
    stepGoalIds: Object.keys(stepGoalIds).length > 0 ? stepGoalIds : undefined,
  };
}

/**
 * Sync a finished CU step status onto its mapped MissionControl goal.
 */
export async function syncComputerUseStepGoalStatus(
  stepGoalIds: Record<string, number> | undefined,
  stepId: string,
  status: "completed" | "failed" | "inconclusive" | string,
  options?: {
    updateGoalStatus?: typeof missionControlService.updateGoalStatus;
  },
): Promise<boolean> {
  const goalId = stepGoalIds?.[stepId];
  if (goalId == null) return false;

  const update =
    options?.updateGoalStatus?.bind(missionControlService) ??
    ((id: number, s: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED") =>
      missionControlService.updateGoalStatus(id, s));

  const goalStatus =
    status === "completed"
      ? "COMPLETED"
      : status === "failed"
        ? "FAILED"
        : "FAILED"; // inconclusive treated as failed for MC progress

  await update(goalId, goalStatus);
  return true;
}
