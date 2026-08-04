export interface StructuredLogEntry {
  timestamp: number;
  sessionId: string;
  conversationId?: string;
  turnId?: string;
  traceId?: string;
  provider?: string;
  component: string;
  operation: string;
  durationMs?: number;
  status: "success" | "failure" | "in_progress";
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

export class StructuredLogger {
  public static log(entry: StructuredLogEntry): void {
    const formatted = JSON.stringify({
      ts: new Date(entry.timestamp).toISOString(),
      ...entry,
    });
    if (entry.status === "failure") {
      console.error(`[LUCA_LOG] ${formatted}`);
    } else {
      console.log(`[LUCA_LOG] ${formatted}`);
    }
  }
}
