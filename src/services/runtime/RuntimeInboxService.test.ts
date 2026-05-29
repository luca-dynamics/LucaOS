import { describe, expect, it } from "vitest";
import { ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { RuntimeInboxService } from "./RuntimeInboxService";
class MemoryStorage { private values = new Map<string, string>(); getItem(key: string): string | null { return this.values.get(key) ?? null; } setItem(key: string, value: string): void { this.values.set(key, value); } }

describe("RuntimeInboxService", () => {
  it("ingests, lists, reads, and archives inert sanitized events", () => {
    const storage = new MemoryStorage();
    const provenance = new ProvenanceGateService(storage).createProvenanceRecord({ sourceType: "external_input", sourceId: "stub" });
    const inbox = new RuntimeInboxService(storage);
    const event = inbox.ingestEvent({ source: "external_stub", sourceTrustLevel: "untrusted", title: "External", body: "token=secret-value", eventType: "external", provenance, requiresApproval: false, metadata: { apiKey: "sk-secret123456", nested: { unsafe: true } } });
    expect(inbox.listEvents()).toHaveLength(1);
    expect(event.body).toContain("[redacted]");
    expect(event.metadata.apiKey).toBe("[redacted]");
    expect(event.metadata.inert).toBe(true);
    expect(inbox.getUnreadCount()).toBe(1);
    inbox.markRead(event.inboxEventId);
    expect(inbox.getUnreadCount()).toBe(0);
    inbox.archiveEvent(event.inboxEventId);
    expect(inbox.getDiagnosticsSummary().archivedEvents).toBe(1);
  });
});
