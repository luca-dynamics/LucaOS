import {
  ComputerUseActionPlan,
  ComputerUseActionPlannerOptions,
  ComputerUseActionPlanningInput,
  ComputerUseFocusContext,
  ComputerUsePlannedAction,
} from "./types";

export class ComputerUseActionPlanner {
  private readonly options: ComputerUseActionPlannerOptions;
  private lastPlan?: ComputerUseActionPlan;

  constructor(options: ComputerUseActionPlannerOptions = {}) {
    this.options = options;
  }

  createPlan(input: ComputerUseActionPlanningInput): ComputerUseActionPlan {
    const plan = this.planFromFocusContext(input);
    this.lastPlan = plan;
    return plan;
  }

  planFromFocusContext(input: ComputerUseActionPlanningInput): ComputerUseActionPlan {
    const { focusContext, textPayload } = input;

    const candidateAction =
      this.createTypeTextAction(focusContext, textPayload) ?? this.createClickAction(focusContext);

    const action = candidateAction ?? this.createObserveAction("No reliable focus target for action planning.");

    return {
      actions: [action],
      requiresGuardApproval: this.requiresGuardApproval(focusContext, action),
      prefersSandbox: this.preferSandbox(focusContext),
      metadata: {
        planningOnly: true,
        actionsExecuted: false,
        systemApisUsed: false,
      },
    };
  }

  requiresGuardApproval(focusContext: ComputerUseFocusContext, action: ComputerUsePlannedAction): boolean {
    if (action.type === "observe") {
      return false;
    }

    return focusContext.requiresGuardApproval;
  }

  preferSandbox(focusContext: ComputerUseFocusContext): boolean {
    return focusContext.trustTier === "untrusted" || focusContext.prefersSandbox;
  }

  createObserveAction(reason: string): ComputerUsePlannedAction {
    return {
      type: "observe",
      reason,
      requiresGuardApproval: false,
    };
  }

  createClickAction(focusContext: ComputerUseFocusContext): ComputerUsePlannedAction | undefined {
    const userPointedTarget = focusContext.userPointedTarget;
    if (!userPointedTarget) {
      return undefined;
    }

    return {
      type: "click",
      target: {
        description: userPointedTarget.description,
        cursorPoint: userPointedTarget.cursorPoint,
        region: userPointedTarget.region,
      },
      reason: "User-pointed target provides reliable click grounding.",
      requiresGuardApproval: focusContext.requiresGuardApproval,
    };
  }

  createTypeTextAction(
    focusContext: ComputerUseFocusContext,
    textPayload?: string,
  ): ComputerUsePlannedAction | undefined {
    const text = textPayload?.trim();
    if (!text) {
      return undefined;
    }

    const focusedElement = focusContext.focusedElement;
    if (!focusedElement || focusedElement.role !== "textbox") {
      return undefined;
    }

    return {
      type: "type_text",
      target: {
        role: focusedElement.role,
        label: focusedElement.label,
        selectorHint: focusedElement.selectorHint,
      },
      text,
      reason: "Focused text input and text payload are available.",
      requiresGuardApproval: focusContext.requiresGuardApproval,
    };
  }

  reset(): void {
    this.lastPlan = undefined;
  }
}
