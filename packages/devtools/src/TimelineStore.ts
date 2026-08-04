import { FlightRecorderTraceEntry } from "./TraceCollector";

export interface ExportedSessionFlight {
  sessionId: string;
  conversationId: string;
  exportedAt: number;
  totalEvents: number;
  traces: FlightRecorderTraceEntry[];
}

export class TimelineStore {
  private traces: FlightRecorderTraceEntry[] = [];

  public addTrace(trace: FlightRecorderTraceEntry): void {
    this.traces.push(trace);
  }

  public setTraces(traces: FlightRecorderTraceEntry[]): void {
    this.traces = [...traces];
  }

  public getTraces(): readonly FlightRecorderTraceEntry[] {
    return this.traces;
  }

  public exportJson(sessionId = "sess_export", conversationId = "conv_export"): string {
    const flight: ExportedSessionFlight = {
      sessionId,
      conversationId,
      exportedAt: Date.now(),
      totalEvents: this.traces.length,
      traces: this.traces,
    };
    return JSON.stringify(flight, null, 2);
  }
}
