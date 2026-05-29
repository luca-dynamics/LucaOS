import type { AgentSessionContinuityDiagnosticsSummary, AgentSessionContinuityRecord } from "../../types/agentSessionContinuity";

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; }
const STORAGE_KEY = "LUCA_AGENT_SESSION_CONTINUITY_V1";
const MAX_SESSIONS = 200;
function nowIso(): string { return new Date().toISOString(); }
function storage(): StorageLike | undefined { if (typeof window !== "undefined" && window.localStorage) return window.localStorage; if (typeof localStorage !== "undefined") return localStorage; return undefined; }
function readSessions(store: StorageLike | undefined): AgentSessionContinuityRecord[] { try { const raw = store?.getItem(STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function safeToResume(record: AgentSessionContinuityRecord): boolean { return record.lifecycleState === "resumable" && record.userVisible && record.safeToResume && record.provenanceIds.length > 0; }

export class AgentSessionContinuityService {
  private sessions: AgentSessionContinuityRecord[];
  constructor(private readonly backingStorage: StorageLike | undefined = storage()) { this.sessions = readSessions(this.backingStorage); }
  createSession(input: Partial<AgentSessionContinuityRecord> & { title: string; mode: AgentSessionContinuityRecord["mode"]; provenanceIds: string[] }): AgentSessionContinuityRecord {
    const timestamp = nowIso();
    const record: AgentSessionContinuityRecord = { sessionId: input.sessionId ?? `agent-session:${timestamp}`, title: input.title, mode: input.mode, lifecycleState: input.lifecycleState ?? "active", lastUserIntentSummary: input.lastUserIntentSummary ?? "No user intent summary yet.", lastAgentStateSummary: input.lastAgentStateSummary ?? "No agent state summary yet.", pendingActions: input.pendingActions ?? [], pendingApprovalIds: input.pendingApprovalIds ?? [], relatedMemoryIds: input.relatedMemoryIds ?? [], relatedSkillIds: input.relatedSkillIds ?? [], relatedJobIds: input.relatedJobIds ?? [], provenanceIds: input.provenanceIds, createdAt: input.createdAt ?? timestamp, updatedAt: timestamp, lastResumedAt: input.lastResumedAt, userVisible: input.userVisible ?? true, safeToResume: input.safeToResume ?? input.provenanceIds.length > 0 };
    this.upsert(record);
    return record;
  }
  updateSession(sessionId: string, update: Partial<AgentSessionContinuityRecord>): AgentSessionContinuityRecord | undefined { const existing = this.sessions.find((item) => item.sessionId === sessionId); if (!existing) return undefined; const next = { ...existing, ...update, sessionId: existing.sessionId, createdAt: existing.createdAt, updatedAt: nowIso() }; this.upsert(next); return next; }
  pauseSession(sessionId: string): AgentSessionContinuityRecord | undefined { return this.updateSession(sessionId, { lifecycleState: "paused" }); }
  markResumable(sessionId: string): AgentSessionContinuityRecord | undefined { const existing = this.sessions.find((item) => item.sessionId === sessionId); return this.updateSession(sessionId, { lifecycleState: "resumable", safeToResume: Boolean(existing?.userVisible && existing.provenanceIds.length > 0), lastResumedAt: nowIso() }); }
  completeSession(sessionId: string): AgentSessionContinuityRecord | undefined { return this.updateSession(sessionId, { lifecycleState: "completed", safeToResume: false }); }
  archiveSession(sessionId: string): AgentSessionContinuityRecord | undefined { return this.updateSession(sessionId, { lifecycleState: "archived", userVisible: false, safeToResume: false }); }
  listSessions(): AgentSessionContinuityRecord[] { return [...this.sessions]; }
  listResumableSessions(): AgentSessionContinuityRecord[] { return this.sessions.filter(safeToResume); }
  getDiagnosticsSummary(): AgentSessionContinuityDiagnosticsSummary { return { totalSessions: this.sessions.length, activeSessions: this.sessions.filter((item) => item.lifecycleState === "active").length, resumableSessions: this.sessions.filter((item) => item.lifecycleState === "resumable").length, pausedSessions: this.sessions.filter((item) => item.lifecycleState === "paused").length, quarantinedSessions: this.sessions.filter((item) => item.lifecycleState === "quarantined").length, safeToResumeSessions: this.listResumableSessions().length }; }
  private upsert(record: AgentSessionContinuityRecord): void { this.sessions = [record, ...this.sessions.filter((item) => item.sessionId !== record.sessionId)]; if (this.sessions.length > MAX_SESSIONS) this.sessions = this.sessions.slice(0, MAX_SESSIONS); this.backingStorage?.setItem(STORAGE_KEY, JSON.stringify(this.sessions)); }
}
export const agentSessionContinuityService = new AgentSessionContinuityService();
