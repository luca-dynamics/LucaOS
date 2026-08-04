import { LucaRuntimeState, TurnSnapshot } from "../../../contracts/src";

export interface ConversationSessionCheckpoint {
  sessionId: string;
  conversationId: string;
  timestamp: number;
  runtimeState: LucaRuntimeState;
  turnsCount: number;
  lastTurnSnapshot?: TurnSnapshot;
  metadata: Record<string, unknown>;
}

export class SessionStore {
  private checkpoints = new Map<string, ConversationSessionCheckpoint>();

  public saveCheckpoint(checkpoint: ConversationSessionCheckpoint): void {
    this.checkpoints.set(checkpoint.sessionId, checkpoint);
    console.log(`💾 [SessionStore] Saved checkpoint for Session #${checkpoint.sessionId} (State: ${checkpoint.runtimeState}, Turns: ${checkpoint.turnsCount})`);
  }

  public getCheckpoint(sessionId: string): ConversationSessionCheckpoint | undefined {
    return this.checkpoints.get(sessionId);
  }

  public hasCheckpoint(sessionId: string): boolean {
    return this.checkpoints.has(sessionId);
  }

  public deleteCheckpoint(sessionId: string): void {
    this.checkpoints.delete(sessionId);
  }

  public listSessions(): string[] {
    return Array.from(this.checkpoints.keys());
  }
}
