import { describe, expect, it } from "vitest";
import { AgentSessionContinuityService } from "./AgentSessionContinuityService";
class MemoryStorage { private values = new Map<string, string>(); getItem(key: string): string | null { return this.values.get(key) ?? null; } setItem(key: string, value: string): void { this.values.set(key, value); } }

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
});
