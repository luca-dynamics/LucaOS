import {
  ComputerUseGuardBridgeInput,
  ComputerUseGuardBridgeOptions,
  ComputerUseGuardDecision,
  ComputerUsePlannedAction,
} from "./types";

export class ComputerUseGuardBridge {
  private readonly options: ComputerUseGuardBridgeOptions;

  constructor(options: ComputerUseGuardBridgeOptions = {}) {
    this.options = options;
  }

  evaluatePlan(input: ComputerUseGuardBridgeInput): ComputerUseGuardDecision {
    const actions = input.plan?.actions ?? [];

    for (const action of actions) {
      const decision = this.evaluateAction({ ...input, action });
      if (decision.status !== "allowed") {
        return decision;
      }
    }

    if (input.plan?.requiresGuardApproval && !input.request?.guardApprovalProvided) {
      return this.requiresApproval("Guard approval required for planned actions.");
    }

    if (input.dangerousContext && !input.request?.guardApprovalProvided) {
      return this.requiresApproval("Guard approval required for dangerous context.");
    }

    return this.allow("Plan allowed by scaffold guard bridge.");
  }

  evaluateAction(input: ComputerUseGuardBridgeInput): ComputerUseGuardDecision {
    const action = input.action;
    if (!action) {
      return this.allow("No action provided.");
    }

    if (this.isExplicitlyDenied(action)) {
      return this.denyDangerousWithoutApproval(`Action type '${action.type}' denied by scaffold policy.`);
    }

    if (action.type === "observe") {
      return this.allow("Observe action is always allowed.");
    }

    if (action.requiresGuardApproval && !input.request?.guardApprovalProvided) {
      return this.requiresApproval("Guard approval required for this action.");
    }

    if (input.dangerousContext && !input.request?.guardApprovalProvided) {
      return this.requiresApproval("Guard approval required for dangerous context.");
    }

    return this.allow("Action allowed by scaffold guard bridge.");
  }

  requiresApproval(reason: string): ComputerUseGuardDecision {
    return this.buildDecision("requires_approval", reason);
  }

  denyDangerousWithoutApproval(reason: string): ComputerUseGuardDecision {
    return this.buildDecision("denied", reason);
  }

  reset(): void {
    // stateless scaffold
  }

  private isExplicitlyDenied(action: ComputerUsePlannedAction): boolean {
    return Boolean(this.options.denyActions?.includes(action.type));
  }

  private allow(reason: string): ComputerUseGuardDecision {
    return this.buildDecision("allowed", reason);
  }

  private buildDecision(status: ComputerUseGuardDecision["status"], reason: string): ComputerUseGuardDecision {
    return {
      status,
      reason,
      metadata: {
        guardBridgeKind: "scaffold",
        externalGuardCalled: false,
      },
    };
  }
}
