import { describe, expect, it, vi } from "vitest";
import { LucaBrowserActionQueueService } from "./LucaBrowserActionQueueService";
import { LUCA_BROWSER_ACTION_EVENT } from "../../types/lucaBrowserActions";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function createService(sessionStatus = "open") {
  const storage = new MemoryStorage();
  const inbox = { ingestEvent: vi.fn((event: unknown) => ({ inboxEventId: "inbox:1", ...(event as Record<string, unknown>) })) };
  const bus = { emitEvent: vi.fn(), emit: vi.fn() };
  const shellService = {
    getShellSession: vi.fn((id: string) => (id === "missing" ? undefined : { shellSessionId: id, status: sessionStatus })),
    getObservationSnapshot: vi.fn(() => ({ observationId: "obs:1" })),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new LucaBrowserActionQueueService({ storage, inbox, bus, shellService } as any);
  return { service, bus, shellService };
}

describe("LucaBrowserActionQueueService", () => {
  it("creates a waiting_user_confirmation request for an allowed click and emits an audit event", () => {
    const { service, bus } = createService();
    const req = service.createActionRequest({ shellSessionId: "s1", kind: "propose_click", targetDescriptor: "the menu button" });
    expect(req?.status).toBe("waiting_user_confirmation");
    expect(req?.policyDecision.allowedForExecution).toBe(false);
    expect(req?.policyDecision.allowedForFutureHumanConfirmedExecution).toBe(true);
    expect(req?.observationId).toBe("obs:1");
    expect(bus.emit).toHaveBeenCalledWith(LUCA_BROWSER_ACTION_EVENT, expect.objectContaining({ kind: "propose_click" }));
    expect(bus.emitEvent).toHaveBeenCalled();
  });

  it("returns undefined for an unknown session", () => {
    const { service } = createService();
    expect(service.createActionRequest({ shellSessionId: "missing", kind: "propose_click" })).toBeUndefined();
  });

  it("creates a blocked request for forbidden kinds and credential-like typed text", () => {
    const { service } = createService();
    const login = service.createActionRequest({ shellSessionId: "s1", kind: "login" });
    expect(login?.status).toBe("blocked");
    expect(login?.blockedBy?.length).toBeGreaterThan(0);

    const secret = service.createActionRequest({ shellSessionId: "s1", kind: "propose_type", typedText: "password is 12345" });
    expect(secret?.status).toBe("blocked");
    expect(secret?.typedTextPreview).toBeUndefined();
    expect(secret?.blockedBy).toContain("credential_like_text");
  });

  it("stores a sanitized capped typed-text preview for safe propose_type", () => {
    const { service } = createService();
    const req = service.createActionRequest({ shellSessionId: "s1", kind: "propose_type", typedText: "  search   query  " });
    expect(req?.typedTextPreview).toBe("search query");
  });

  it("blocks any action when the governed session is inactive", () => {
    const { service } = createService("closed");
    const req = service.createActionRequest({ shellSessionId: "s1", kind: "propose_back" });
    expect(req?.status).toBe("blocked");
    expect(req?.blockedBy).toContain("inactive_governed_session");
  });

  it("confirm changes status to confirmed_for_future_execution but never executes", () => {
    const { service } = createService();
    const req = service.createActionRequest({ shellSessionId: "s1", kind: "propose_scroll" });
    const confirmed = service.confirmActionRequestForFutureExecution(req!.actionRequestId);
    expect(confirmed?.status).toBe("confirmed_for_future_execution");
    expect(confirmed?.confirmedAt).toBeTruthy();
    expect(confirmed?.policyDecision.allowedForExecution).toBe(false);
  });

  it("does not confirm a blocked request", () => {
    const { service } = createService();
    const blocked = service.createActionRequest({ shellSessionId: "s1", kind: "payment" });
    const result = service.confirmActionRequestForFutureExecution(blocked!.actionRequestId);
    expect(result?.status).toBe("blocked");
  });

  it("supports revoke and archive transitions", () => {
    const { service } = createService();
    const req = service.createActionRequest({ shellSessionId: "s1", kind: "propose_click", targetDescriptor: "a tab" });
    const revoked = service.revokeActionRequest(req!.actionRequestId, "no longer needed");
    expect(revoked?.status).toBe("revoked");
    expect(revoked?.revokedAt).toBeTruthy();
    const archived = service.archiveActionRequest(req!.actionRequestId);
    expect(archived?.status).toBe("archived");
  });

  it("reports diagnostics with execution disabled and human confirmation required", () => {
    const { service } = createService();
    service.createActionRequest({ shellSessionId: "s1", kind: "propose_click", targetDescriptor: "a" });
    service.createActionRequest({ shellSessionId: "s1", kind: "login" });
    const diag = service.getDiagnosticsSummary();
    expect(diag.totalActionRequests).toBe(2);
    expect(diag.waitingConfirmationRequests).toBe(1);
    expect(diag.blockedRequests).toBe(1);
    expect(diag.executionEnabled).toBe(false);
    expect(diag.humanConfirmationRequired).toBe(true);
    expect(diag.automationEnabled).toBe(false);
    expect(diag.domReadEnabled).toBe(false);
  });

  it("exposes no execute/click/type/readDom methods", () => {
    const { service } = createService();
    const forbidden = ["execute", "executeAction", "click", "type", "scroll", "submit", "readDom", "screenshot", "ocr", "runAction", "performAction"];
    for (const name of forbidden) {
      expect((service as unknown as Record<string, unknown>)[name]).toBeUndefined();
    }
  });
});
