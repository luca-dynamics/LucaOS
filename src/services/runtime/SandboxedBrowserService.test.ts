import { describe, expect, it, vi } from "vitest";
import { SandboxedBrowserService } from "./SandboxedBrowserService";
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
  const service = new SandboxedBrowserService({ storage, inbox, bus });
  return { service, storage, inbox, bus };
}

describe("SandboxedBrowserService", () => {
  it("creates a dry_run_only or waiting_user request for eligible browse intent", () => {
    const { service } = createService();
    const record = service.createBrowserRequest({ title: "Open site", summary: "open this website", source: "test", provenanceIds: ["prov:test"] });
    expect(["dry_run_only", "waiting_user"]).toContain(record.status);
    expect(record.policyDecision.allowedForLaunch).toBe(false);
    expect(record.policyDecision.allowedForAutomation).toBe(false);
  });

  it("creates blocked records for login / download / wallet / payment", () => {
    const { service } = createService();
    expect(service.createBrowserRequest({ title: "Login", summary: "log in with my password", source: "test" }).status).toBe("blocked");
    expect(service.createBrowserRequest({ title: "Download", summary: "download this file", source: "test" }).status).toBe("blocked");
    expect(service.createBrowserRequest({ title: "Wallet", summary: "connect wallet", source: "test" }).status).toBe("blocked");
    expect(service.createBrowserRequest({ title: "Pay", summary: "checkout and pay", source: "test" }).status).toBe("blocked");
  });

  it("creates a dry-run session only from eligible requests", () => {
    const { service } = createService();
    const dryRun = service.createBrowserRequest({ title: "Open", summary: "open this website", source: "test" });
    expect(dryRun.status).toBe("dry_run_only");
    const session = service.createDryRunSessionFromRequest(dryRun.browserRequestId);
    expect(session?.status).toBe("dry_run_only");
    expect(session?.summary.toLowerCase()).toContain("dry-run browser permission session only");

    const blocked = service.createBrowserRequest({ title: "Login", summary: "log in", source: "test" });
    expect(service.createDryRunSessionFromRequest(blocked.browserRequestId)).toBeUndefined();
  });

  it("revokes and archives requests and sessions", () => {
    const { service } = createService();
    const request = service.createBrowserRequest({ title: "Open", summary: "open this website", source: "test" });
    expect(service.revokeBrowserRequest(request.browserRequestId)?.status).toBe("blocked");

    const dryRun = service.createBrowserRequest({ title: "Open2", summary: "open another website", source: "test" });
    const session = service.createDryRunSessionFromRequest(dryRun.browserRequestId);
    expect(service.revokeBrowserSession(session!.browserSessionId)?.status).toBe("revoked");
    expect(service.archiveBrowserSession(session!.browserSessionId)?.status).toBe("archived");
  });

  it("summarizes records with launch / automation / DOM / network disabled", () => {
    const stack = createService();
    stack.service.createBrowserRequest({ title: "Open", summary: "open this website", source: "test" });
    const reloaded = new SandboxedBrowserService({ storage: stack.storage, inbox: stack.inbox, bus: stack.bus });
    expect(reloaded.listBrowserRequests()).toHaveLength(1);
    const summary = reloaded.getDiagnosticsSummary();
    expect(summary.totalRequests).toBe(1);
    expect(summary.launchEnabled).toBe(false);
    expect(summary.automationEnabled).toBe(false);
    expect(summary.domReadEnabled).toBe(false);
    expect(summary.networkRequestEnabled).toBe(false);
    expect(summary.dryRunOnly).toBe(true);
  });

  it("does not expose any launch / execute / open / click / type method", () => {
    const { service } = createService();
    for (const method of ["launchBrowser", "openUrl", "execute", "click", "type", "submit", "navigate", "readDom", "scrape"]) {
      expect(method in service).toBe(false);
    }
  });
});
