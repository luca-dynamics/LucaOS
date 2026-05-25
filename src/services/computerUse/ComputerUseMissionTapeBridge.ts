import {
  ComputerUseActionPlan,
  ComputerUseExecutionResult,
  ComputerUseFocusContext,
  ComputerUseRecoveryPlan,
  ComputerUseTapeEvent,
  ComputerUseTapeEventType,
  ComputerUseTapeRecord,
  ComputerUseVerificationResult,
  ComputerUseMissionTapeBridgeOptions,
} from "./types";

export class ComputerUseMissionTapeBridge {
  private readonly options: ComputerUseMissionTapeBridgeOptions;
  private readonly events: ComputerUseTapeEvent[] = [];

  constructor(options: ComputerUseMissionTapeBridgeOptions = {}) {
    this.options = options;
  }

  recordFocusContext(missionId: string, payload: ComputerUseFocusContext): ComputerUseTapeEvent {
    return this.recordEvent(missionId, "focus_context", payload);
  }

  recordActionPlan(missionId: string, payload: ComputerUseActionPlan): ComputerUseTapeEvent {
    return this.recordEvent(missionId, "action_plan", this.redactActionPlan(payload));
  }

  recordExecutionResult(missionId: string, payload: ComputerUseExecutionResult): ComputerUseTapeEvent {
    return this.recordEvent(missionId, "execution_result", this.redactExecutionResult(payload));
  }

  recordVerificationResult(missionId: string, payload: ComputerUseVerificationResult): ComputerUseTapeEvent {
    return this.recordEvent(missionId, "verification_result", payload);
  }

  recordRecoveryPlan(missionId: string, payload: ComputerUseRecoveryPlan): ComputerUseTapeEvent {
    return this.recordEvent(missionId, "recovery_plan", payload);
  }

  createTapeRecord(missionId: string): ComputerUseTapeRecord {
    return {
      missionId,
      events: this.listEvents(missionId),
      metadata: {
        bridgeKind: "scaffold",
        storageWritesEnabled: false,
        missionTapeIntegrationEnabled: false,
      },
    };
  }

  listEvents(missionId?: string): ComputerUseTapeEvent[] {
    if (!missionId) return [...this.events];
    return this.events.filter((event) => event.missionId === missionId);
  }

  reset(): void {
    this.events.length = 0;
  }

  private recordEvent(missionId: string, eventType: ComputerUseTapeEventType, payload: unknown): ComputerUseTapeEvent {
    const event: ComputerUseTapeEvent = {
      missionId,
      timestamp: this.now(),
      eventType,
      payload,
    };

    this.events.push(event);
    return event;
  }

  private redactExecutionResult(payload: ComputerUseExecutionResult): ComputerUseExecutionResult {
    if (payload.action.type !== "type_text") return payload;

    return {
      ...payload,
      action: {
        ...payload.action,
        text: this.redactText(payload.action.text),
      },
    };
  }

  private redactActionPlan(payload: ComputerUseActionPlan): ComputerUseActionPlan {
    return {
      ...payload,
      actions: payload.actions.map((action) => {
        if (action.type !== "type_text") return action;

        return {
          ...action,
          text: this.redactText(action.text),
        };
      }),
    };
  }

  private redactText(text: string | undefined): string | undefined {
    if (text === undefined) return text;
    if (this.options.redactSensitiveText === false) return text;
    return "[REDACTED]";
  }

  private now(): string {
    return this.options.now?.() ?? new Date().toISOString();
  }
}
