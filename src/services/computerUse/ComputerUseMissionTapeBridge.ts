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
  private events: ComputerUseTapeEvent[] = [];

  constructor(options: ComputerUseMissionTapeBridgeOptions = {}) {
    this.options = options;
  }

  recordFocusContext(missionId: string, focusContext: ComputerUseFocusContext): ComputerUseTapeEvent {
    return this.recordEvent(missionId, "focus_context", focusContext);
  }

  recordActionPlan(missionId: string, actionPlan: ComputerUseActionPlan): ComputerUseTapeEvent {
    const payload: ComputerUseActionPlan = {
      ...actionPlan,
      actions: actionPlan.actions.map((action) => this.redactAction(action)),
    };

    return this.recordEvent(missionId, "action_plan", payload);
  }

  recordExecutionResult(missionId: string, executionResult: ComputerUseExecutionResult): ComputerUseTapeEvent {
    const payload: ComputerUseExecutionResult = {
      ...executionResult,
      action: this.redactAction(executionResult.action),
    };

    return this.recordEvent(missionId, "execution_result", payload);
  }

  recordVerificationResult(missionId: string, verificationResult: ComputerUseVerificationResult): ComputerUseTapeEvent {
    return this.recordEvent(missionId, "verification_result", verificationResult);
  }

  recordRecoveryPlan(missionId: string, recoveryPlan: ComputerUseRecoveryPlan): ComputerUseTapeEvent {
    return this.recordEvent(missionId, "recovery_plan", recoveryPlan);
  }

  createTapeRecord(missionId: string): ComputerUseTapeRecord {
    return {
      missionId,
      events: this.listEvents(missionId),
      metadata: this.baseMetadata(),
    };
  }

  listEvents(missionId?: string): ComputerUseTapeEvent[] {
    if (!missionId) return [...this.events];
    return this.events.filter((event) => event.missionId === missionId);
  }

  reset(): void {
    this.events = [];
  }

  private recordEvent(
    missionId: string,
    eventType: ComputerUseTapeEventType,
    payload: ComputerUseTapeEvent["payload"],
  ): ComputerUseTapeEvent {
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

  private redactAction(action: ComputerUseExecutionResult["action"]): ComputerUseExecutionResult["action"] {
    if (this.options.redactSensitiveText === false) return { ...action };
    if (action.type !== "type_text" || action.text === undefined) return { ...action };

    return {
      ...action,
      text: "[REDACTED]",
    };
  }

  private now(): string {
    return this.options.now?.() ?? new Date().toISOString();
  }

  private baseMetadata(): ComputerUseTapeEvent["metadata"] {
    return {
      bridgeKind: "scaffold",
      storageWritesEnabled: false,
    };
  }
}
