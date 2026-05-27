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
    const hasNonObserveActions = actions.some((action) => action.type !== "observe");

    for (const action of actions) {
      const decision = this.evaluateAction({ ...input, action });
      if (decision.status !== "allowed") {
        return decision;
      }
    }

    if (!hasNonObserveActions) {
      return this.allow("Observe-only plan is always allowed.");
    }

    if (input.plan?.requiresGuardApproval && !this.hasApproval(input)) {
      return this.needsConfirmation("Guard approval required for planned actions.", input, "high");
    }

    if (hasNonObserveActions && input.dangerousContext && !this.hasApproval(input)) {
      return this.needsConfirmation("Guard approval required for dangerous context.", input, "high");
    }

    return this.allow("Plan allowed by scaffold guard bridge.");
  }

  evaluateAction(input: ComputerUseGuardBridgeInput): ComputerUseGuardDecision {
    const action = input.action;
    if (!action) {
      return this.allow("No action provided.");
    }

    if (this.isExplicitlyDenied(action)) {
      return this.denyDangerousWithoutApproval(`Action type '${action.type}' denied by scaffold policy.`, input);
    }

    if (action.type === "observe") {
      return this.allow("Observe action is always allowed.");
    }

    const risk = this.classifyRisk(input);
    if (risk === "critical") {
      return this.denyDangerousWithoutApproval("Critical-risk action is denied in scaffold mode.", input, "critical");
    }
    if ((action.requiresGuardApproval || risk === "high" || risk === "medium" || input.dangerousContext) && !this.hasApproval(input)) {
      return this.needsConfirmation("Action requires explicit confirmation in scaffold mode.", input, risk);
    }

    return this.allow("Action allowed by scaffold guard bridge.");
  }

  needsConfirmation(
    reason: string,
    input: ComputerUseGuardBridgeInput,
    riskLevel: "low" | "medium" | "high" | "critical",
  ): ComputerUseGuardDecision {
    return this.buildDecision("needs_confirmation", reason, input, riskLevel, true, "user_confirmation_required");
  }

  denyDangerousWithoutApproval(
    reason: string,
    input: ComputerUseGuardBridgeInput,
    riskLevel: "low" | "medium" | "high" | "critical" = "critical",
  ): ComputerUseGuardDecision {
    return this.buildDecision("denied", reason, input, riskLevel, false, "guard_approval");
  }

  reset(): void {
    // stateless scaffold
  }

  private isExplicitlyDenied(action: ComputerUsePlannedAction): boolean {
    return Boolean(this.options.denyActions?.includes(action.type));
  }

  private allow(reason: string): ComputerUseGuardDecision {
    return this.buildDecision("allowed", reason, {}, "low", false, "none");
  }

  private buildDecision(
    status: ComputerUseGuardDecision["status"],
    reason: string,
    input: ComputerUseGuardBridgeInput,
    riskLevel: "low" | "medium" | "high" | "critical",
    confirmationRequired: boolean,
    approvalRequirement: "none" | "guard_approval" | "user_confirmation_required",
  ): ComputerUseGuardDecision {
    return {
      status,
      reason,
      metadata: {
        guardPolicyKind: "scaffold",
        externalGuardCalled: false,
        systemApisCalled: false,
        directHostAllowed: false,
        requiresExplicitOptIn: true,
        missionId: input.request?.missionId,
        stepId: input.request?.stepId,
        actionType: input.action?.type,
        riskLevel,
        status,
        confirmationRequired,
        approvalRequirement,
      },
    };
  }

  private hasApproval(input: ComputerUseGuardBridgeInput): boolean {
    if (input.request?.guardApprovalProvided) return true;
    if (input.request?.approval?.userConfirmed) return true;
    return Boolean(input.request?.approval?.approvedBy && input.request?.approval?.approvalReason);
  }

  private classifyRisk(input: ComputerUseGuardBridgeInput): "low" | "medium" | "high" | "critical" {
    const actionType = input.action?.type;
    const reason = `${input.action?.reason ?? ""} ${input.request?.approval?.approvalReason ?? ""}`.toLowerCase();
    if (!actionType) return "low";
    if (actionType === "observe" || actionType === "wait") return "low";
    if (actionType === "scroll") return "medium";
    if (actionType === "click" || actionType === "type_text") return "high";
    if (actionType === "hotkey") return "critical";
    if (/(terminal|delete|rm\b|install|send|payment|transfer|credential|password|secret|token|direct.host|direct host)/.test(reason)) {
      return "critical";
    }
    return "critical";
  }
}
