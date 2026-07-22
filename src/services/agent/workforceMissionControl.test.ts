import { describe, expect, it, vi } from "vitest";
import {
  attachMissionControlToWorkflowPlan,
  syncWorkflowTaskGoalStatus,
} from "./workforceMissionControl";
import type { WorkflowPlan, WorkflowTask } from "./LucaWorkforce";

function samplePlan(): WorkflowPlan {
  return {
    workflowId: "workflow_1",
    goal: "Ship the feature",
    tasks: [
      {
        id: "task_0",
        persona: "ENGINEER",
        description: "implement module",
        estimatedComplexity: 5,
        dependencies: [],
        status: "pending",
      },
      {
        id: "task_1",
        persona: "AUDITOR",
        description: "review code",
        estimatedComplexity: 3,
        dependencies: ["task_0"],
        status: "pending",
      },
    ] as WorkflowTask[],
    parallelGroups: [],
  };
}

describe("workforceMissionControl", () => {
  it("attaches mission and maps task ids to goal ids", async () => {
    let goalSeq = 100;
    const startMission = vi.fn(async () => 42);
    const addGoal = vi.fn(async () => ++goalSeq);

    const plan = samplePlan();
    const result = await attachMissionControlToWorkflowPlan(plan, {
      hasBridge: () => true,
      startMission: startMission as any,
      addGoal: addGoal as any,
    });

    expect(result.attached).toBe(true);
    expect(result.missionControlId).toBe(42);
    expect(plan.missionControlId).toBe(42);
    expect(plan.taskGoalIds).toEqual({
      task_0: 101,
      task_1: 102,
    });
    expect(result.checkpointId).toBeTruthy();
    expect(startMission).toHaveBeenCalledWith(
      "Ship the feature",
      expect.objectContaining({
        source: "luca_workforce",
        workflowId: "workflow_1",
      }),
    );
    expect(addGoal).toHaveBeenCalledTimes(2);
  });

  it("skips attach when bridge missing", async () => {
    const plan = samplePlan();
    const result = await attachMissionControlToWorkflowPlan(plan, {
      hasBridge: () => false,
    });
    expect(result.attached).toBe(false);
    expect(plan.missionControlId).toBeUndefined();
  });

  it("syncs task status to mapped goal id", async () => {
    const updateGoalStatus = vi.fn(async () => undefined);
    const plan = samplePlan();
    plan.taskGoalIds = { task_0: 55 };
    const task = { ...plan.tasks[0], status: "complete" as const };

    const ok = await syncWorkflowTaskGoalStatus(plan, task, {
      updateGoalStatus: updateGoalStatus as any,
    });
    expect(ok).toBe(true);
    expect(updateGoalStatus).toHaveBeenCalledWith(55, "COMPLETED");
  });

  it("syncs in-progress task to IN_PROGRESS goal", async () => {
    const updateGoalStatus = vi.fn(async () => undefined);
    const plan = samplePlan();
    plan.taskGoalIds = { task_0: 55 };
    const task = { ...plan.tasks[0], status: "in-progress" as const };

    const ok = await syncWorkflowTaskGoalStatus(plan, task, {
      updateGoalStatus: updateGoalStatus as any,
    });
    expect(ok).toBe(true);
    expect(updateGoalStatus).toHaveBeenCalledWith(55, "IN_PROGRESS");
  });

  it("returns false when task has no mapped goal", async () => {
    const plan = samplePlan();
    const ok = await syncWorkflowTaskGoalStatus(plan, plan.tasks[0]);
    expect(ok).toBe(false);
  });
});
