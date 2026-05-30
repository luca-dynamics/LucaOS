import { describe, expect, it, vi } from "vitest";
import { SandboxedBrowserShellService } from "./SandboxedBrowserShellService";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function createService() {
  return new SandboxedBrowserShellService({
    storage: new MemoryStorage(),
    inbox: { ingestEvent: vi.fn(() => ({ inboxEventId: "inbox:test" })) } as never,
    bus: { emitEvent: vi.fn(), emit: vi.fn() } as never,
  });
}

describe("SandboxedBrowserShellService — adapter metadata (PR #135)", () => {
  it("records the adapter on the session without enabling any capability", () => {
    const service = createService();
    const created = service.openApprovedSafeUrl({ url: "https://example.com", source: "test" });
    expect(created.status).toBe("open_requested");

    const opened = service.markShellOpened(created.shellSessionId, "luca_browser_webview");
    expect(opened?.status).toBe("open");
    expect(opened?.metadata.adapter).toBe("luca_browser_webview");
    // Capability flags must remain false even with an adapter recorded.
    const summary = service.getDiagnosticsSummary();
    expect(summary.automationEnabled).toBe(false);
    expect(summary.domReadEnabled).toBe(false);
    expect(summary.credentialsEnabled).toBe(false);
    expect(summary.walletPaymentEnabled).toBe(false);
  });

  it("still works (and stays safe) when no adapter is provided", () => {
    const service = createService();
    const created = service.openApprovedSafeUrl({ url: "https://example.com", source: "test" });
    const opened = service.markShellOpened(created.shellSessionId);
    expect(opened?.status).toBe("open");
    expect(opened?.metadata.adapter).toBeUndefined();

    const summary = service.getDiagnosticsSummary();
    expect(summary.automationEnabled).toBe(false);
    expect(summary.domReadEnabled).toBe(false);
    expect(summary.credentialsEnabled).toBe(false);
  });
});
