import { LucaRuntimeProcess } from "../LucaRuntimeProcess";
import { SessionStore } from "./SessionStore";
import { ConversationRuntime } from "./ConversationRuntime";
import { EventStore } from "../events/EventStore";

export class SessionManager {
  public store: SessionStore;
  private activeSessions = new Map<string, ConversationRuntime>();

  constructor(public runtimeProcess: LucaRuntimeProcess, public eventStore?: EventStore) {
    this.store = new SessionStore();
  }

  public createSession(sessionId?: string, conversationId?: string): ConversationRuntime {
    const sId = sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cId = conversationId || `conv_${Date.now()}`;
    const runtime = new ConversationRuntime(this.runtimeProcess, this.store, this.eventStore, sId, cId);
    this.activeSessions.set(sId, runtime);
    console.log(`✨ [SessionManager] Created active ConversationRuntime Actor #${sId}`);
    return runtime;
  }

  public getSession(sessionId: string): ConversationRuntime | undefined {
    return this.activeSessions.get(sessionId);
  }

  public listActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  public terminateSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.suspend();
      this.activeSessions.delete(sessionId);
      console.log(`🛑 [SessionManager] Terminated ConversationRuntime Actor #${sessionId}`);
    }
  }
}
