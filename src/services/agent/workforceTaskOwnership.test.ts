// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { LucaWorkforce } from "./LucaWorkforce";
import type { WorkflowPlan, WorkflowTask } from "./LucaWorkforce";

/**
 * Task ids are only unique within a plan (`task_0`, `task_1`, …) and completed
 * workflows are never pruned from activeWorkflows, so resolving a task's owning
 * plan by id sent every later workflow's progress onto the first workflow's
 * MissionControl goals.
 */
function planWithCollidingTaskIds(
  workflowId: string,
  missionControlId: number,
  goalId: number,
): WorkflowPlan {
  return {
    workflowId,
    goal: `Goal for ${workflowId}`,
    tasks: [
      {
        id: "task_0",
        persona: "ENGINEER",
        description: `implement for ${workflowId}`,
        estimatedComplexity: 5,
        dependencies: [],
        status: "pending",
      },
    ] as WorkflowTask[],
    parallelGroups: [],
    missionControlId,
    taskGoalIds: { task_0: goalId },
  };
}

type WorkforceInternals = {
  activeWorkflows: Map<string, WorkflowPlan>;
  findPlanForTask(task: WorkflowTask): WorkflowPlan | undefined;
};

describe("LucaWorkforce task ownership across workflows", () => {
  it("resolves a task to its own workflow when task ids collide", () => {
    const workforce = new LucaWorkforce();
    const internals = workforce as unknown as WorkforceInternals;

    const first = planWithCollidingTaskIds("workflow_1", 10, 100);
    const second = planWithCollidingTaskIds("workflow_2", 20, 200);
    internals.activeWorkflows.set(first.workflowId, first);
    internals.activeWorkflows.set(second.workflowId, second);

    // Both tasks are literally named "task_0".
    expect(first.tasks[0].id).toBe(second.tasks[0].id);

    // Documents the hazard: the previous id-based scan resolved the second
    // workflow's task to the *first* workflow, so its progress was written
    // onto the wrong mission's goals.
    const idScan = [...internals.activeWorkflows.values()].find((p) =>
      p.tasks.some((t) => t.id === second.tasks[0].id),
    );
    expect(idScan?.workflowId).toBe("workflow_1");

    const ownerOfSecond = internals.findPlanForTask(second.tasks[0]);
    expect(ownerOfSecond?.workflowId).toBe("workflow_2");
    expect(ownerOfSecond?.missionControlId).toBe(20);

    const ownerOfFirst = internals.findPlanForTask(first.tasks[0]);
    expect(ownerOfFirst?.workflowId).toBe("workflow_1");
    expect(ownerOfFirst?.missionControlId).toBe(10);
  });

  it("does not attribute a later workflow's task to an earlier finished one", () => {
    const workforce = new LucaWorkforce();
    const internals = workforce as unknown as WorkforceInternals;

    // A finished workflow is never pruned, so it stays first in iteration order.
    const finished = planWithCollidingTaskIds("workflow_old", 1, 11);
    finished.tasks[0].status = "complete";
    const fresh = planWithCollidingTaskIds("workflow_new", 2, 22);
    internals.activeWorkflows.set(finished.workflowId, finished);
    internals.activeWorkflows.set(fresh.workflowId, fresh);

    const owner = internals.findPlanForTask(fresh.tasks[0]);
    expect(owner?.taskGoalIds?.task_0).toBe(22);
  });

  it("returns undefined for a task belonging to no active workflow", () => {
    const workforce = new LucaWorkforce();
    const internals = workforce as unknown as WorkforceInternals;
    const orphan = planWithCollidingTaskIds("workflow_gone", 3, 33);

    expect(internals.findPlanForTask(orphan.tasks[0])).toBeUndefined();
  });
});
