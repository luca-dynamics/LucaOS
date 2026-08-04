export type ExecutionMode = "LIVE" | "MOCK" | "SIMULATION" | "REPLAY";

export type ConnectionState = "CONNECTED" | "CONNECTING" | "DEGRADED" | "DISCONNECTED" | "CIRCUIT_OPEN";

export type LucaRuntimeState = "Idle" | "Listening" | "Understanding" | "Thinking" | "Acting" | "Speaking" | "Recovering";

export class InvalidTransitionError extends Error {
  constructor(public fromState: LucaRuntimeState, public toState: LucaRuntimeState) {
    super(`[FSM Invalid Transition] Cannot transition directly from state '${fromState}' to '${toState}'.`);
    this.name = "InvalidTransitionError";
  }
}

export class CancellationToken {
  private isCancelledState = false;
  private listeners: Array<() => void> = [];
  public children: CancellationToken[] = [];

  constructor(public parentToken?: CancellationToken) {
    if (parentToken) {
      parentToken.children.push(this);
      if (parentToken.isCancelled()) {
        this.cancel();
      }
    }
  }

  public cancel(): void {
    if (this.isCancelledState) return;
    this.isCancelledState = true;
    this.listeners.forEach((fn) => fn());
    this.children.forEach((child) => child.cancel());
    console.log("⛔ [CancellationToken] Cancellation requested! Propagating across hierarchical tree...");
  }

  public isCancelled(): boolean {
    return this.isCancelledState || (this.parentToken ? this.parentToken.isCancelled() : false);
  }

  public onCancel(listener: () => void): void {
    if (this.isCancelled()) {
      listener();
    } else {
      this.listeners.push(listener);
    }
  }

  public throwIfCancelled(): void {
    if (this.isCancelled()) {
      throw new Error("[CancellationToken] Operation cancelled by user barge-in or hierarchical interrupt.");
    }
  }
}

export type RuntimeEventDomain =
  | "Session"
  | "Turn"
  | "Speech"
  | "LLM"
  | "Tool"
  | "Worker"
  | "Memory"
  | "Runtime"
  | "Provider"
  | "Orb";

export type RuntimeEventType =
  | "SessionCreated"
  | "SessionSuspended"
  | "SessionRecovered"
  | "TurnStarted"
  | "TurnCompleted"
  | "WorkerQueued"
  | "WorkerCompleted"
  | "ToolStarted"
  | "ToolCompleted"
  | "MemoryRead"
  | "MemoryWritten"
  | "ProviderConnected"
  | "ProviderDisconnected"
  | "RuntimeStateChanged"
  | "OrbExpressionChanged";

export interface RuntimeEvent {
  id: string;
  sessionId: string;
  timestamp: number;
  sequence: number;
  domain: RuntimeEventDomain;
  type: RuntimeEventType;
  payload: unknown;
}
