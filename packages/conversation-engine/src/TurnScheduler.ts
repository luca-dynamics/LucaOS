export interface TurnRequest {
  sessionId?: string;
  userPrompt: string;
  priority?: "normal" | "high" | "critical";
  metadata?: Record<string, unknown>;
}

export interface TurnHandle {
  turnId: string;
  sessionId: string;
  request: TurnRequest;
  status: "queued" | "active" | "completed" | "cancelled" | "interrupted";
  startTime: number;
  endTime?: number;
}

export interface ITurnScheduler {
  beginTurn(request: TurnRequest): TurnHandle;
  cancelTurn(turnId: string, reason?: string): void;
  interrupt(turnId: string): void;
  complete(turnId: string): void;
  current(): TurnHandle | undefined;
  queue(): readonly TurnHandle[];
}

export class TurnScheduler implements ITurnScheduler {
  private activeTurn: TurnHandle | undefined;
  private turnQueue: TurnHandle[] = [];

  public beginTurn(request: TurnRequest): TurnHandle {
    const handle: TurnHandle = {
      turnId: `turn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sessionId: request.sessionId || "session_default",
      request,
      status: "queued",
      startTime: Date.now(),
    };

    if (request.priority === "critical" && this.activeTurn) {
      this.interrupt(this.activeTurn.turnId);
    }

    if (!this.activeTurn) {
      handle.status = "active";
      this.activeTurn = handle;
    } else {
      this.turnQueue.push(handle);
    }

    return handle;
  }

  public cancelTurn(turnId: string, _reason?: string): void {
    if (this.activeTurn && this.activeTurn.turnId === turnId) {
      this.activeTurn.status = "cancelled";
      this.activeTurn.endTime = Date.now();
      this.activeTurn = undefined;
      this.processQueue();
    } else {
      this.turnQueue = this.turnQueue.filter((t) => t.turnId !== turnId);
    }
  }

  public interrupt(turnId: string): void {
    if (this.activeTurn && this.activeTurn.turnId === turnId) {
      this.activeTurn.status = "interrupted";
      this.activeTurn.endTime = Date.now();
      this.activeTurn = undefined;
      this.processQueue();
    }
  }

  public complete(turnId: string): void {
    if (this.activeTurn && this.activeTurn.turnId === turnId) {
      this.activeTurn.status = "completed";
      this.activeTurn.endTime = Date.now();
      this.activeTurn = undefined;
      this.processQueue();
    }
  }

  public current(): TurnHandle | undefined {
    return this.activeTurn;
  }

  public queue(): readonly TurnHandle[] {
    return this.turnQueue;
  }

  private processQueue(): void {
    if (!this.activeTurn && this.turnQueue.length > 0) {
      const next = this.turnQueue.shift()!;
      next.status = "active";
      this.activeTurn = next;
    }
  }
}
