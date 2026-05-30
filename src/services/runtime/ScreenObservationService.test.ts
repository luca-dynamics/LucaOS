import { describe, expect, it, vi } from "vitest";
import { ScreenObservationService } from "./ScreenObservationService";
import type { RuntimeInboxEvent } from "../../types/runtimeInbox";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function createService() {
  const storage = new MemoryStorage();
  const inbox = { ingestEvent: vi.fn((event: Omit<RuntimeInboxEvent, "inboxEventId" | "createdAt" | "metadata"> & { inboxEventId?: string; createdAt?: string; metadata?: Record<string, unknown> }) => ({ inboxEventId: "inbox:test", createdAt: "2026-01-01T00:00:00.000Z", metadata: {}, ...event })) };
  const bus = { emitEvent: vi.fn(), emit: vi.fn() };
  const service = new ScreenObservationService({ storage, inbox, bus });
  return { service, storage, inbox, bus };
}

describe("ScreenObservationService", () => {
  it("creates a dry_run_only or consent_required request for eligible observe intent", () => {
    const { service } = createService();
    const record = service.createObservationRequest({ title: "Observe screen", summary: "look at my screen", source: "test", provenanceIds: ["prov:test"] });
    expect(["dry_run_only", "consent_required"]).toContain(record.status);
    expect(record.policyDecision.allowedForCapture).toBe(false);
    expect(record.policyDecision.allowedForVisionModel).toBe(false);
  });

  it("creates a blocked request for secret-like input", () => {
    const { service } = createService();
    const record = service.createObservationRequest({ title: "Observe", summary: "read my password on screen", source: "test" });
    expect(record.status).toBe("blocked");
    expect(record.riskLevel).toBe("critical");
  });

  it("creates a dry-run / waiting-consent session only from eligible requests", () => {
    const { service } = createService();
    const dryRun = service.createObservationRequest({ title: "Region", summary: "observe this region", source: "test" });
    expect(dryRun.status).toBe("dry_run_only");
    const session = service.createDryRunSessionFromRequest(dryRun.observationRequestId);
    expect(session?.status).toBe("dry_run_only");

    const blocked = service.createObservationRequest({ title: "Text", summary: "read text on screen", source: "test" });
    expect(service.createDryRunSessionFromRequest(blocked.observationRequestId)).toBeUndefined();
  });

  it("revokes requests and sessions, and archives", () => {
    const { service } = createService();
    const request = service.createObservationRequest({ title: "Region", summary: "observe this region", source: "test" });
    expect(service.revokeObservationRequest(request.observationRequestId)?.status).toBe("revoked");
    expect(service.archiveObservationRequest(request.observationRequestId)?.status).toBe("archived");

    const dryRun = service.createObservationRequest({ title: "Window", summary: "observe this window", source: "test" });
    const session = service.createDryRunSessionFromRequest(dryRun.observationRequestId);
    expect(service.revokeObservationSession(session!.observationSessionId)?.status).toBe("revoked");
  });

  it("persists, lists, and summarizes records with capture/vision disabled", () => {
    const stack = createService();
    stack.service.createObservationRequest({ title: "Window", summary: "observe this window", source: "test" });
    const reloaded = new ScreenObservationService({ storage: stack.storage, inbox: stack.inbox, bus: stack.bus });
    expect(reloaded.listObservationRequests()).toHaveLength(1);
    const summary = reloaded.getDiagnosticsSummary();
    expect(summary.totalRequests).toBe(1);
    expect(summary.captureEnabled).toBe(false);
    expect(summary.visionModelEnabled).toBe(false);
    expect(summary.dryRunOnly).toBe(true);
  });

  it("does not expose a capture or execute method", () => {
    const { service } = createService();
    expect("captureScreen" in service).toBe(false);
    expect("executeObservation" in service).toBe(false);
    expect("startCapture" in service).toBe(false);
    expect("runVisionModel" in service).toBe(false);
  });
});
