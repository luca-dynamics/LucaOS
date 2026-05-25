import {
  ComputerUseActionPlan,
  ComputerUseExecutionResult,
  ComputerUseFocusContext,
  ComputerUseMissionTapeBridgeOptions,
  ComputerUseRecoveryPlan,
  ComputerUseTapeEvent,
  ComputerUseTapeEventType,
  ComputerUseTapeRecord,
  ComputerUseVerificationResult,
} from "./types";

export class ComputerUseMissionTapeBridge {
  private readonly options: ComputerUseMissionTapeBridgeOptions;
  private readonly events: ComputerUseTapeEvent[] = [];

  constructor(options: ComputerUseMissionTapeBridgeOptions = {}) {
    this.options = options;
  }

  recordFocusContext(missionId: string, focusContext: ComputerUseFocusContext): ComputerUseTapeEvent {
    return this.pushEvent(missionId, "focus_context", focusContext);
  }

  recordActionPlan(missionId: string, actionPlan: ComputerUseActionPlan): ComputerUseTapeEvent {
    const payload = {
      ...actionPlan,
      actions: actionPlan.actions.map((action) => this.redactPlannedAction(action)),
    };

    return this.pushEvent(missionId, "action_plan", payload);
  }

  recordExecutionResult(missionId: string, executionResult: ComputerUseExecutionResult): ComputerUseTapeEvent {
    const payload = {
      ...executionResult,
      action: this.redactPlannedAction(executionResult.action),
    };

    return this.pushEvent(missionId, "execution_result", payload);
  }

  recordVerificationResult(missionId: string, verificationResult: ComputerUseVerificationResult): ComputerUseTapeEvent {
    return this.pushEvent(missionId, "verification_result", verificationResult);
  }

  recordRecoveryPlan(missionId: string, recoveryPlan: ComputerUseRecoveryPlan): ComputerUseTapeEvent {
    return this.pushEvent(missionId, "recovery_plan", recoveryPlan);
  }

  createTapeRecord(missionId: string): ComputerUseTapeRecord {
    return {
      missionId,
      events: this.listEvents(missionId),
      metadata: this.baseMetadata(),
    };
  }

  listEvents(missionId?: string): ComputerUseTapeEvent[] {
    if (!missionId) {
      return [...this.events];
    }

    return this.events.filter((event) => event.missionId === missionId);
  }

  reset(): void {
    this.events.length = 0;
  }

  private pushEvent(missionId: string, eventType: ComputerUseTapeEventType, payload: unknown): ComputerUseTapeEvent {
    const event: ComputerUseTapeEvent = {
      missionId,
      timestamp: this.now(),
      eventType,
      payload,
      metadata: this.baseMetadata(),
    };

    this.events.push(event);

    return event;
  }

  private now(): string {
    return this.options.now?.() ?? new Date().toISOString();
  }

  private redactPlannedAction<T extends { type: string; text?: string }>(action: T): T {
    const shouldRedact = this.options.redactSensitiveText !== false;
    if (!shouldRedact || action.type !== "type_text" || action.text === undefined) {
      return action;
    }

    return {
      ...action,
      text: "[REDACTED]",
    };
  }

  private baseMetadata(): ComputerUseTapeEvent["metadata"] {
    return {
      bridgeKind: "scaffold",
      storageWritesEnabled: false,
      missionTapeIntegrationEnabled: false,
    };
  }
}
