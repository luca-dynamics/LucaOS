import { TurnExecutionPlan, ExecutionDAGNode, ExecutionBudget } from "../../../contracts/src";

export class TaskPlanner {
  public static decomposeUserIntent(userPrompt: string): TurnExecutionPlan {
    const budget: ExecutionBudget = {
      maxLatencyMs: 1500,
      maxTokens: 4096,
      maxCost: 0.05,
      maxWorkers: 3,
      priority: "high",
      deadline: Date.now() + 1500,
    };

    const dag: ExecutionDAGNode[] = [
      {
        stepId: "step_mem_1",
        stepName: "Memory Recall",
        subsystem: "memory",
        description: "Retrieve user facts & preferences",
        dependsOn: [],
        estimatedDurationMs: 45,
      },
      {
        stepId: "step_agent_research_2",
        stepName: "Autonomous Research",
        subsystem: "worker",
        description: "Research topic context concurrently",
        dependsOn: ["step_mem_1"],
        estimatedDurationMs: 180,
      },
      {
        stepId: "step_agent_calendar_3",
        stepName: "Calendar Scheduling",
        subsystem: "worker",
        description: "Check schedule conflicts concurrently",
        dependsOn: ["step_mem_1"],
        estimatedDurationMs: 120,
      },
      {
        stepId: "step_llm_synth_4",
        stepName: "LLM Response Synthesis",
        subsystem: "llm",
        description: "Synthesize response from agent worker outputs",
        dependsOn: ["step_agent_research_2", "step_agent_calendar_3"],
        estimatedDurationMs: 240,
      },
    ];

    return {
      planId: `plan_dag_${Date.now()}`,
      userPrompt,
      budget,
      dag,
    };
  }
}
