import { LucaRuntimeState, TurnSnapshot } from "../../../contracts/src";
import { LucaRuntimeProcess } from "../LucaRuntimeProcess";
import { SessionStore, ConversationSessionCheckpoint } from "./SessionStore";
import { EventStore } from "../events/EventStore";

export interface RuntimeMailboxMessage {
  type: "USER_PROMPT" | "WORKER_COMPLETED" | "TOOL_RESULT" | "LIFECYCLE_COMMAND";
  payload: Record<string, unknown>;
  timestamp?: number;
}

export class ConversationRuntime {
  public sessionId: string;
  public conversationId: string;
  public isSuspended = false;
  public turnsCount = 0;
  private lastSnapshot?: TurnSnapshot;
  private mailboxQueue: RuntimeMailboxMessage[] = [];

  constructor(
    public runtimeProcess: LucaRuntimeProcess,
    public store: SessionStore,
    public eventStore?: EventStore,
    sessionId = "sess_main",
    conversationId = "conv_main"
  ) {
    this.sessionId = sessionId;
    this.conversationId = conversationId;
  }

  public post(message: RuntimeMailboxMessage): void {
    this.mailboxQueue.push(message);
    console.log(`📬 [Actor Mailbox] Session #${this.sessionId} received message [${message.type}]`);
    this.processMailbox();
  }

  private processMailbox(): void {
    while (this.mailboxQueue.length > 0) {
      const msg = this.mailboxQueue.shift();
      if (!msg) break;

      if (this.eventStore) {
        this.eventStore.append({
          sessionId: this.sessionId,
          timestamp: Date.now(),
          domain: "Session",
          type: "TurnStarted",
          payload: msg,
        });
      }
    }
  }

  public suspend(): void {
    this.isSuspended = true;
    this.checkpoint("suspend_requested");
    if (this.eventStore) {
      this.eventStore.append({
        sessionId: this.sessionId,
        timestamp: Date.now(),
        domain: "Session",
        type: "SessionSuspended",
        payload: { reason: "suspend_requested" },
      });
    }
    console.log(`⏸️ [ConversationRuntime] Session #${this.sessionId} SUSPENDED and checkpointed.`);
  }

  public resume(): void {
    if (!this.isSuspended) return;
    this.isSuspended = false;
    if (this.eventStore) {
      this.eventStore.append({
        sessionId: this.sessionId,
        timestamp: Date.now(),
        domain: "Session",
        type: "SessionRecovered",
        payload: { reason: "resume_requested" },
      });
    }
    console.log(`▶️ [ConversationRuntime] Session #${this.sessionId} RESUMED successfully.`);
  }

  public checkpoint(reason = "manual_checkpoint"): ConversationSessionCheckpoint {
    const cp: ConversationSessionCheckpoint = {
      sessionId: this.sessionId,
      conversationId: this.conversationId,
      timestamp: Date.now(),
      runtimeState: this.runtimeProcess.currentState,
      turnsCount: this.turnsCount,
      lastTurnSnapshot: this.lastSnapshot,
      metadata: { reason },
    };
    this.store.saveCheckpoint(cp);
    return cp;
  }

  public recover(): boolean {
    const cp = this.store.getCheckpoint(this.sessionId);
    if (!cp) {
      console.warn(`⚠️ [ConversationRuntime] No checkpoint found to recover Session #${this.sessionId}`);
      return false;
    }
    this.turnsCount = cp.turnsCount;
    this.isSuspended = false;
    console.log(`🔄 [ConversationRuntime] RECOVERED Session #${this.sessionId} from checkpoint (State: ${cp.runtimeState}, Turns: ${cp.turnsCount})`);
    return true;
  }

  public recordCompletedTurn(snapshot: TurnSnapshot): void {
    this.turnsCount++;
    this.lastSnapshot = snapshot;
    this.checkpoint("turn_completed");
    if (this.eventStore) {
      this.eventStore.append({
        sessionId: this.sessionId,
        timestamp: Date.now(),
        domain: "Turn",
        type: "TurnCompleted",
        payload: { turnId: snapshot.conversation.turnId },
      });
    }
  }
}
