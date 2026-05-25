import {
  ComputerUseActionPlan,
  ComputerUseActionPlannerOptions,
  ComputerUseActionPlanningInput,
  ComputerUseFocusContext,
  ComputerUsePlannedAction,
} from "./types";

export class ComputerUseActionPlanner {
  private options: ComputerUseActionPlannerOptions;
  private lastPlan?: ComputerUseActionPlan;

  constructor(options: ComputerUseActionPlannerOptions = {}) {
    this.options = options;
  }

  createPlan(actions: ComputerUsePlannedAction[], context: ComputerUseFocusContext): ComputerUseActionPlan {
    const plan: ComputerUseActionPlan = {
      actions,
      requiresGuardApproval: this.requiresGuardApproval(context),
      prefersSandbox: this.preferSandbox(context),
      metadata: {
        planningOnly: true,
        executionEnabled: false,
        mouseKeyboardApisEnabled: false,
        systemApisEnabled: false,
      },
    };

    this.lastPlan = plan;
    return plan;
  }

  planFromFocusContext(input: ComputerUseActionPlanningInput): ComputerUseActionPlan {
    const { context, textPayload } = input;
    const actions: ComputerUsePlannedAction[] = [];

    if (context.userPointedTarget) {
      actions.push(this.createClickAction("Candidate click from user-pointed target"));
    }

    const focusedInput = context.focusedElement?.role === "textbox" || context.focusedElement?.role === "input";
    if (focusedInput && textPayload) {
      actions.push(this.createTypeTextAction(textPayload));
    }

    if (actions.length === 0) {
      actions.push(this.createObserveAction("No reliable focus target available"));
    }

    return this.createPlan(actions, context);
  }

  requiresGuardApproval(context: ComputerUseFocusContext): boolean {
    return context.requiresGuardApproval;
  }

  preferSandbox(context: ComputerUseFocusContext): boolean {
    return context.prefersSandbox || context.trustTier === "untrusted";
  }

  createObserveAction(reason: string): ComputerUsePlannedAction {
    return {
      type: "observe",
      reason,
      requiresGuardApproval: false,
    };
  }

  createClickAction(reason: string): ComputerUsePlannedAction {
    return {
      type: "click",
      reason,
      requiresGuardApproval: false,
    };
  }

  createTypeTextAction(text: string): ComputerUsePlannedAction {
    return {
      type: "type_text",
      text,
      reason: "Candidate type action from focused input",
      requiresGuardApproval: false,
    };
  }

  reset(): void {
    this.lastPlan = undefined;
  }
}
