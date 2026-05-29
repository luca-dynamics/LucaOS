import { describe, expect, it, vi } from "vitest";
import { BrowserDesktopGatewayService } from "./BrowserDesktopGatewayService";
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
  const service = new BrowserDesktopGatewayService({ storage, inbox, bus });
  return { service, storage, inbox, bus };
}

describe("BrowserDesktopGatewayService", () => {
  it("creates dry_run_only record for eligible observe intent", () => {
    const { service } = createService();
    const record = service.createGatewayRequest({
      title: "Observe screen",
      summary: "look at my screen",
      source: "test",
      provenanceIds: ["prov:test"],
    });
    expect(record.status).toBe("dry_run_only");
    expect(record.policyDecision.allowedForExecution).toBe(false);
    expect(record.policyDecision.allowedForDryRun).toBe(true);
  });

  it("creates blocked records for wallet, file delete, and login", () => {
    const { service } = createService();
    expect(service.createGatewayRequest({ title: "Wallet", summary: "send wallet transaction", source: "test" }).status).toBe("blocked");
    expect(service.createGatewayRequest({ title: "Delete", summary: "delete file config", source: "test" }).status).toBe("blocked");
    expect(service.createGatewayRequest({ title: "Login", summary: "login to browser", source: "test" }).status).toBe("blocked");
  });

  it("persists, lists, archives, and summarizes records", () => {
    const stack = createService();
    const record = stack.service.createGatewayRequest({ title: "Read DOM", summary: "read browser page", source: "test" });
    expect(stack.service.listGatewayRequests()).toHaveLength(1);

    const reloaded = new BrowserDesktopGatewayService({ storage: stack.storage, inbox: stack.inbox, bus: stack.bus });
    expect(reloaded.listGatewayRequests()).toHaveLength(1);
    expect(reloaded.archiveGatewayRequest(record.gatewayRequestId)?.status).toBe("archived");

    const summary = reloaded.getDiagnosticsSummary();
    expect(summary.totalRequests).toBe(1);
    expect(summary.executionEnabled).toBe(false);
    expect(summary.dryRunOnly).toBe(true);
  });

  it("does not expose an execute method", () => {
    const { service } = createService();
    expect("executeGatewayRequest" in service).toBe(false);
    expect("runGatewayRequest" in service).toBe(false);
  });
});
