/**
 * Workforce ↔ MissionControl attach helpers.
 * Creates a MissionControl mission when a workflow starts and maps task ids
 * to real goal ids (replacing the old i+1 index hack).
 */

import type { WorkflowPlan, WorkflowTask } from "./LucaWorkforce";
import { missionControlService } from "./MissionControlService";

export interface AttachMissionControlResult {
  attached: boolean;
  missionControlId?: number;
  taskGoalIds?: Record<string, number>;
  reason?: string;
}

/**
 * Start a MissionControl mission and one goal per workflow task.
 * Soft-fails when Electron bridge is missing (web-safe).
 */
export async function attachMissionControlToWorkflowPlan(
  plan: WorkflowPlan,
  options?: {
    startMission?: typeof missionControlService.startMission;
    addGoal?: typeof missionControlService.addGoal;
    hasBridge?: () => boolean;
  },
): Promise<AttachMissionControlResult> {
  const hasBridge =
    options?.hasBridge ??
    (() =>
      typeof window !== "undefined" &&
      Boolean(window.luca?.missionControl?.start));

  if (!hasBridge()) {
    return {
      attached: false,
      reason: "MissionControl bridge unavailable",
    };
  }

  const start =
    options?.startMission?.bind(missionControlService) ??
    ((title: string, metadata?: unknown) =>
      missionControlService.startMission(title, metadata));
  const addGoal =
    options?.addGoal?.bind(missionControlService) ??
    ((missionId: number, description: string) =>
      missionControlService.addGoal(missionId, description));

  const missionId = await start(plan.goal, {
    source: "luca_workforce",
    workflowId: plan.workflowId,
  });

  const taskGoalIds: Record<string, number> = {};
  for (const task of plan.tasks) {
    const goalId = await addGoal(
      missionId,
      `[${task.persona}] ${task.description}`,
    );
    taskGoalIds[task.id] = goalId;
  }

  plan.missionControlId = missionId;
  plan.taskGoalIds = taskGoalIds;

  return {
    attached: true,
    missionControlId: missionId,
    taskGoalIds,
  };
}

export async function syncWorkflowTaskGoalStatus(
  plan: WorkflowPlan,
  task: WorkflowTask,
  options?: {
    updateGoalStatus?: typeof missionControlService.updateGoalStatus;
  },
): Promise<boolean> {
  const goalId = plan.taskGoalIds?.[task.id];
  if (goalId == null) return false;

  const update =
    options?.updateGoalStatus?.bind(missionControlService) ??
    ((id: number, status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED") =>
      missionControlService.updateGoalStatus(id, status));

  await update(goalId, task.status === "complete" ? "COMPLETED" : "FAILED");
  return true;
}
