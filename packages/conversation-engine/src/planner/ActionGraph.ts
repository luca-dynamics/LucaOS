import { ExecutionPlan, ExecutionResult } from "./ExecutionPlan";

export class ActionGraph {
  public async execute(
    plan: ExecutionPlan,
    stepExecutor: (stepId: string, kind: string) => Promise<unknown>
  ): Promise<ExecutionResult> {
    plan.status = "running";
    const results: Record<string, unknown> = {};

    try {
      for (const step of plan.steps) {
        step.status = "running";
        const stepOutput = await stepExecutor(step.id, step.kind);
        results[step.id] = stepOutput;
        step.status = "completed";
      }

      plan.status = "completed";
      return {
        planId: plan.planId,
        success: true,
        stepResults: results,
      };
    } catch (err) {
      plan.status = "failed";
      return {
        planId: plan.planId,
        success: false,
        stepResults: results,
        error: String(err),
      };
    }
  }
}
