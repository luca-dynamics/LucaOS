import { AssistantEvent, EventBus } from "../../voice-engine/src";

export interface FlightRecorderTraceEntry {
  traceId: string;
  sessionId: string;
  conversationId: string;
  turnId?: string;
  actionId?: string;
  event: AssistantEvent;
  timestamp: number;
}

export class TraceCollector {
  private traces: FlightRecorderTraceEntry[] = [];
  private sessionId: string;
  private conversationId: string;

  constructor(eventBus: EventBus, sessionId = "sess_default", conversationId = "conv_default") {
    this.sessionId = sessionId;
    this.conversationId = conversationId;

    eventBus.subscribe("*", (event) => {
      this.recordEvent(event);
    });
  }

  public recordEvent(event: AssistantEvent, turnId?: string, actionId?: string): void {
    const trace: FlightRecorderTraceEntry = {
      traceId: `trace_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sessionId: this.sessionId,
      conversationId: this.conversationId,
      turnId,
      actionId,
      event,
      timestamp: Date.now(),
    };
    this.traces.push(trace);
  }

  public getTraces(): readonly FlightRecorderTraceEntry[] {
    return this.traces;
  }

  public clear(): void {
    this.traces = [];
  }
}
