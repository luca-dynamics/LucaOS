/**
 * Luca Agent Tracing System
 * Stolen from Eigent's traceroot pattern
 *
 * Provides distributed tracing for debugging multi-agent workflows
 * Shows which Luca persona did what, when, and why
 */

export interface TraceEvent {
  traceId: string;
  agentId: string;
  event: string;
  timestamp: number;
  data?: any;
  duration?: number;
  error?: string;
}

export interface TraceContext {
  traceId: string;
  parentSpanId?: string;
  spanId: string;
  agentId: string;
  startTime: number;
}

class LucaTracingService {
  private traces: Map<string, TraceEvent[]> = new Map();
  private contexts: Map<string, TraceContext> = new Map();
  private enabled: boolean = true;

  constructor() {
    // Check for debug mode
    if (typeof process !== "undefined") {
      this.enabled = process.env.LUCA_TRACE_ENABLED === "true";
    }

    console.log(`[Tracing] Initialized (enabled: ${this.enabled})`);
  }

  /**
   * Start a new trace
   */
  startTrace(workflowId: string, agentId: string): string {
    const traceId = `trace_${workflowId}_${Date.now()}`;
    const spanId = this.generateSpanId();

    const context: TraceContext = {
      traceId,
      spanId,
      agentId,
      startTime: Date.now(),
    };

    this.contexts.set(traceId, context);
    if (!this.traces.has(traceId)) {
      this.traces.set(traceId, []);
    }

    this.log(traceId, agentId, "trace_started", { workflowId });

    return traceId;
  }

  /**
   * Log an event in the trace
   */
  log(
    traceId: string,
    agentId: string,
    event: string,
    data?: any,
    duration?: number
  ): void {
    if (!this.enabled) return;

    const traceEvent: TraceEvent = {
      traceId,
      agentId,
      event,
      timestamp: Date.now(),
      data,
      duration,
    };

    const events = this.traces.get(traceId) || [];
    events.push(traceEvent);
    this.traces.set(traceId, events);

    // Console output
    const durationStr = duration ? ` (${duration}ms)` : "";
    const dataStr = data ? ` ${JSON.stringify(data)}` : "";
    console.log(
      `[TRACE:${traceId}] [${agentId}] ${event}${durationStr}${dataStr}`
    );
  }

  /**
   * Log an error in the trace
   */
  logError(
    traceId: string,
    agentId: string,
    event: string,
    error: Error | string
  ): void {
    const errorMsg = error instanceof Error ? error.message : error;

    const traceEvent: TraceEvent = {
      traceId,
      agentId,
      event,
      timestamp: Date.now(),
      error: errorMsg,
    };

    const events = this.traces.get(traceId) || [];
    events.push(traceEvent);
    this.traces.set(traceId, events);

    console.error(`[TRACE:${traceId}] [${agentId}] ERROR: ${event}`, errorMsg);
  }

  /**
   * End a trace
   */
  endTrace(traceId: string): void {
    const context = this.contexts.get(traceId);
    if (!context) return;

    const duration = Date.now() - context.startTime;
    this.log(traceId, context.agentId, "trace_ended", { duration });

    // Optionally: Save trace to file or send to analytics
    this.exportTrace(traceId);
  }

  /**
   * Get all events for a trace
   */
  getTrace(traceId: string): TraceEvent[] {
    return this.traces.get(traceId) || [];
  }

  /**
   * Get all traces
   */
  getAllTraces(): Map<string, TraceEvent[]> {
    return new Map(this.traces);
  }

  /**
   * Clear old traces (keep last 100)
   */
  cleanup(): void {
    const traceIds = Array.from(this.traces.keys());
    if (traceIds.length > 100) {
      // Remove oldest traces
      const toRemove = traceIds.slice(0, traceIds.length - 100);
      toRemove.forEach((id) => {
        this.traces.delete(id);
        this.contexts.delete(id);
      });

      console.log(`[Tracing] Cleaned up ${toRemove.length} old traces`);
    }
  }

  /**
   * Export trace to JSON
   */
  private exportTrace(traceId: string): void {
    const events = this.getTrace(traceId);
    const context = this.contexts.get(traceId);

    if (!events.length || !context) return;

    const trace = {
      traceId,
      agentId: context.agentId,
      startTime: context.startTime,
      duration: Date.now() - context.startTime,
      events: events.map((e) => ({
        agent: e.agentId,
        event: e.event,
        timestamp: e.timestamp,
        data: e.data,
        duration: e.duration,
        error: e.error,
      })),
    };

    // Save to localStorage for now (could send to backend)
    try {
      const key = `luca_trace_${traceId}`;
      localStorage.setItem(key, JSON.stringify(trace));
    } catch (error) {
      console.error("[Tracing] Failed to export trace:", error);
    }
  }

  /**
   * Generate unique span ID
   */
  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Enable/disable tracing
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`[Tracing] ${enabled ? "Enabled" : "Disabled"}`);
  }
}

// Singleton instance
export const tracingService = new LucaTracingService();

/**
 * Trace decorator for methods
 */
export function trace(eventName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const event = eventName || propertyKey;

    descriptor.value = async function (this: any, ...args: any[]) {
      const traceId = this.traceId || "unknown";
      const agentId = this.agentId || "unknown";
      const startTime = Date.now();

      tracingService.log(traceId, agentId, `${event}_start`, { args });

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        tracingService.log(
          traceId,
          agentId,
          `${event}_end`,
          { result },
          duration
        );
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        tracingService.logError(
          traceId,
          agentId,
          `${event}_error`,
          error as Error
        );
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Helper to create trace for agent execution
 */
export class AgentTrace {
  private traceId: string;
  private agentId: string;

  constructor(workflowId: string, agentId: string) {
    this.traceId = tracingService.startTrace(workflowId, agentId);
    this.agentId = agentId;
  }

  log(event: string, data?: any, duration?: number): void {
    tracingService.log(this.traceId, this.agentId, event, data, duration);
  }

  error(event: string, error: Error | string): void {
    tracingService.logError(this.traceId, this.agentId, event, error);
  }

  end(): void {
    tracingService.endTrace(this.traceId);
  }

  getTraceId(): string {
    return this.traceId;
  }
}
