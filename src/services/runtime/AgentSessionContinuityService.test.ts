import { describe, expect, it } from "vitest";
import { AgentSessionContinuityService } from "./AgentSessionContinuityService";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("AgentSessionContinuityService", () => {
  it("creates, pauses, marks resumable, and excludes quarantined sessions", () => {
    const service = new AgentSessionContinuityService(new MemoryStorage());
    const session = service.createSession({ title: "Continue research", mode: "chat", provenanceIds: ["prov:1"] });
    service.pauseSession(session.sessionId);
    const resumable = service.markResumable(session.sessionId);
    expect(resumable?.safeToResume).toBe(true);
    expect(service.listResumableSessions()).toHaveLength(1);
    service.updateSession(session.sessionId, { lifecycleState: "quarantined", safeToResume: false });
    expect(service.listResumableSessions()).toHaveLength(0);
  });

  it("completeSession sets lifecycleState to completed and safeToResume to false", () => {
    const service = new AgentSessionContinuityService(new MemoryStorage());
    const session = service.createSession({ title: "Task A", mode: "tool_planning", provenanceIds: ["prov:1"] });
    const completed = service.completeSession(session.sessionId);
    expect(completed?.lifecycleState).toBe("completed");
    expect(completed?.safeToResume).toBe(false);
    expect(service.listResumableSessions()).toHaveLength(0);
  });

  it("archiveSession sets lifecycleState to archived, userVisible to false, and safeToResume to false", () => {
    const service = new AgentSessionContinuityService(new MemoryStorage());
    const session = service.createSession({ title: "Task B", mode: "voice", provenanceIds: ["prov:2"] });
    const archived = service.archiveSession(session.sessionId);
    expect(archived?.lifecycleState).toBe("archived");
    expect(archived?.userVisible).toBe(false);
    expect(archived?.safeToResume).toBe(false);
  });

  it("updateSession returns undefined for nonexistent session ID", () => {
    const service = new AgentSessionContinuityService(new MemoryStorage());
    expect(service.updateSession("nonexistent-id", { title: "nope" })).toBeUndefined();
  });

  it("pauseSession and markResumable return undefined for nonexistent session ID", () => {
    const service = new AgentSessionContinuityService(new MemoryStorage());
    expect(service.pauseSession("bad-id")).toBeUndefined();
    expect(service.markResumable("bad-id")).toBeUndefined();
  });

  it("markResumable sets safeToResume to false when userVisible is false", () => {
    const service = new AgentSessionContinuityService(new MemoryStorage());
    const session = service.createSession({ title: "Hidden", mode: "chat", provenanceIds: ["prov:1"], userVisible: false });
    const resumable = service.markResumable(session.sessionId);
    expect(resumable?.lifecycleState).toBe("resumable");
    expect(resumable?.safeToResume).toBe(false);
    expect(service.listResumableSessions()).toHaveLength(0);
  });

  it("markResumable sets safeToResume to false when provenanceIds is empty", () => {
    const service = new AgentSessionContinuityService(new MemoryStorage());
    const session = service.createSession({ title: "No provenance", mode: "chat", provenanceIds: [] });
    const resumable = service.markResumable(session.sessionId);
    expect(resumable?.lifecycleState).toBe("resumable");
    expect(resumable?.safeToResume).toBe(false);
    expect(service.listResumableSessions()).toHaveLength(0);
  });

  it("getDiagnosticsSummary returns correct counts across lifecycle states", () => {
    const service = new AgentSessionContinuityService(new MemoryStorage());
    service.createSession({ sessionId: "s-1", title: "Active 1", mode: "chat", provenanceIds: ["p:1"] });
    service.createSession({ sessionId: "s-2", title: "Active 2", mode: "voice", provenanceIds: ["p:2"] });
    const s3 = service.createSession({ sessionId: "s-3", title: "Will pause", mode: "chat", provenanceIds: ["p:3"] });
    service.pauseSession(s3.sessionId);
    const s4 = service.createSession({ sessionId: "s-4", title: "Will resume", mode: "chat", provenanceIds: ["p:4"] });
    service.markResumable(s4.sessionId);
    const s5 = service.createSession({ sessionId: "s-5", title: "Will quarantine", mode: "chat", provenanceIds: ["p:5"] });
    service.updateSession(s5.sessionId, { lifecycleState: "quarantined" });

    const summary = service.getDiagnosticsSummary();
    expect(summary.totalSessions).toBe(5);
    expect(summary.activeSessions).toBe(2);
    expect(summary.pausedSessions).toBe(1);
    expect(summary.resumableSessions).toBe(1);
    expect(summary.quarantinedSessions).toBe(1);
    expect(summary.safeToResumeSessions).toBe(1);
  });

  it("createSession populates default field values", () => {
    const service = new AgentSessionContinuityService(new MemoryStorage());
    const session = service.createSession({ title: "Defaults", mode: "memory_review", provenanceIds: ["p:x"] });
    expect(session.lastUserIntentSummary).toBe("No user intent summary yet.");
    expect(session.lastAgentStateSummary).toBe("No agent state summary yet.");
    expect(session.pendingActions).toEqual([]);
    expect(session.pendingApprovalIds).toEqual([]);
    expect(session.relatedMemoryIds).toEqual([]);
    expect(session.relatedSkillIds).toEqual([]);
    expect(session.relatedJobIds).toEqual([]);
    expect(session.userVisible).toBe(true);
    expect(session.safeToResume).toBe(true);
    expect(session.lifecycleState).toBe("active");
    expect(session.sessionId).toContain("agent-session:");
  });

  it("createSession accepts an explicit sessionId", () => {
    const service = new AgentSessionContinuityService(new MemoryStorage());
    const session = service.createSession({ sessionId: "custom-id-123", title: "Custom", mode: "chat", provenanceIds: ["p:1"] });
    expect(session.sessionId).toBe("custom-id-123");
  });

  it("persists sessions across service instances via shared storage", () => {
    const storage = new MemoryStorage();
    const service1 = new AgentSessionContinuityService(storage);
    service1.createSession({ title: "Persist me", mode: "chat", provenanceIds: ["p:1"] });
    const service2 = new AgentSessionContinuityService(storage);
    expect(service2.listSessions()).toHaveLength(1);
    expect(service2.listSessions()[0].title).toBe("Persist me");
  });

  it("listSessions returns most recently updated session first", () => {
    const service = new AgentSessionContinuityService(new MemoryStorage());
    const s1 = service.createSession({ sessionId: "first-id", title: "First", mode: "chat", provenanceIds: ["p:1"] });
    service.createSession({ sessionId: "second-id", title: "Second", mode: "chat", provenanceIds: ["p:2"] });
    service.updateSession(s1.sessionId, { title: "First updated" });
    const sessions = service.listSessions();
    expect(sessions[0].title).toBe("First updated");
  });

  it("listResumableSessions returns only sessions matching all safety criteria", () => {
    const service = new AgentSessionContinuityService(new MemoryStorage());
    const s1 = service.createSession({ sessionId: "good-1", title: "Good", mode: "chat", provenanceIds: ["p:1"] });
    service.markResumable(s1.sessionId);
    const s2 = service.createSession({ sessionId: "no-prov-2", title: "No prov", mode: "chat", provenanceIds: [] });
    service.markResumable(s2.sessionId);
    const s3 = service.createSession({ sessionId: "hidden-3", title: "Not visible", mode: "chat", provenanceIds: ["p:3"], userVisible: false });
    service.markResumable(s3.sessionId);
    const s4 = service.createSession({ sessionId: "active-4", title: "Still active", mode: "chat", provenanceIds: ["p:4"] });
    // s4 is active, not resumable state

    const resumable = service.listResumableSessions();
    expect(resumable).toHaveLength(1);
    expect(resumable[0].sessionId).toBe(s1.sessionId);
    expect(s4.lifecycleState).toBe("active");
  });

  it("handles malformed JSON in storage gracefully", () => {
    const storage = new MemoryStorage();
    storage.setItem("LUCA_AGENT_SESSION_CONTINUITY_V1", "not valid json{{{");
    const service = new AgentSessionContinuityService(storage);
    expect(service.listSessions()).toEqual([]);
  });

  it("handles non-array JSON in storage gracefully", () => {
    const storage = new MemoryStorage();
    storage.setItem("LUCA_AGENT_SESSION_CONTINUITY_V1", JSON.stringify({ not: "an array" }));
    const service = new AgentSessionContinuityService(storage);
    expect(service.listSessions()).toEqual([]);
  });

  it("updateSession preserves immutable fields (sessionId, createdAt)", () => {
    const service = new AgentSessionContinuityService(new MemoryStorage());
    const session = service.createSession({ sessionId: "immutable-id", title: "Immutable check", mode: "chat", provenanceIds: ["p:1"] });
    const originalCreatedAt = session.createdAt;

    const updated = service.updateSession(session.sessionId, {
      sessionId: "hacked-id" as any,
      createdAt: "1999-01-01T00:00:00.000Z",
      title: "New title",
    });

    expect(updated?.sessionId).toBe("immutable-id");
    expect(updated?.createdAt).toBe(originalCreatedAt);
    expect(updated?.title).toBe("New title");
  });
});
