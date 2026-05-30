import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SandboxedBrowserShellService } from "./SandboxedBrowserShellService";
import { SANDBOXED_BROWSER_SHELL_OPEN_EVENT } from "../../types/sandboxedBrowserShell";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function createService() {
  const storage = new MemoryStorage();
  const inbox = { ingestEvent: vi.fn((event: unknown) => ({ inboxEventId: `inbox:${Math.random()}`, ...(event as Record<string, unknown>) })) };
  const busEvents: Array<{ type: string }> = [];
  const bus = {
    emitEvent: vi.fn((event: { type: string }) => busEvents.push(event)),
    emit: vi.fn(),
  };
  const service = new SandboxedBrowserShellService({ storage, inbox, bus });
  return { service, inbox, bus, busEvents };
}

describe("SandboxedBrowserShellService", () => {
  let dispatched: Array<{ type: string; detail: unknown }>;

  beforeEach(() => {
    dispatched = [];
    (globalThis as { window?: unknown }).window = {
      dispatchEvent: (event: { type: string; detail: unknown }) => { dispatched.push(event); return true; },
    };
    (globalThis as { CustomEvent?: unknown }).CustomEvent = class {
      type: string;
      detail: unknown;
      constructor(type: string, init?: { detail?: unknown }) { this.type = type; this.detail = init?.detail; }
    };
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { CustomEvent?: unknown }).CustomEvent;
  });

  it("opens an allowed safe URL as open_requested and emits the local event", () => {
    const { service } = createService();
    const session = service.openApprovedSafeUrl({ url: "https://example.com" });
    expect(session.status).toBe("open_requested");
    expect(session.normalizedUrl).toBe("https://example.com/");
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe(SANDBOXED_BROWSER_SHELL_OPEN_EVENT);
  });

  it("creates a blocked record for an unsafe URL and does NOT emit the local event", () => {
    const { service } = createService();
    const session = service.openApprovedSafeUrl({ url: "javascript:alert(1)" });
    expect(session.status).toBe("blocked");
    expect(session.blockedBy).toContain("blocked_scheme");
    expect(dispatched).toHaveLength(0);
  });

  it("never surfaces the URL of a blocked session (audit URL only, no raw secret)", () => {
    const { service } = createService();
    const session = service.openApprovedSafeUrl({ url: "https://example.com/page?token=supersecret" });
    expect(session.status).toBe("blocked");
    expect(session.normalizedUrl).toBe("");
    expect(JSON.stringify(session)).not.toContain("supersecret");
  });

  it("closeShellSession updates state to closed", () => {
    const { service } = createService();
    const session = service.openApprovedSafeUrl({ url: "https://example.com" });
    const closed = service.closeShellSession(session.shellSessionId);
    expect(closed?.status).toBe("closed");
    expect(closed?.closedAt).toBeTruthy();
  });

  it("revokeShellSession updates state to revoked", () => {
    const { service } = createService();
    const session = service.openApprovedSafeUrl({ url: "https://example.com" });
    const revoked = service.revokeShellSession(session.shellSessionId, "user revoked");
    expect(revoked?.status).toBe("revoked");
    expect(revoked?.revokedAt).toBeTruthy();
  });

  it("diagnostics summary reports counts and all-false capability flags", () => {
    const { service } = createService();
    service.openApprovedSafeUrl({ url: "https://example.com" });
    service.openApprovedSafeUrl({ url: "file:///etc/passwd" });
    const diag = service.getDiagnosticsSummary();
    expect(diag.totalSessions).toBe(2);
    expect(diag.openRequestedSessions).toBe(1);
    expect(diag.blockedSessions).toBe(1);
    expect(diag.launchMode).toBe("approved_safe_url_only");
    expect(diag.automationEnabled).toBe(false);
    expect(diag.domReadEnabled).toBe(false);
    expect(diag.credentialsEnabled).toBe(false);
    expect(diag.downloadUploadEnabled).toBe(false);
    expect(diag.walletPaymentEnabled).toBe(false);
  });

  it("exposes no click/type/read/submit/download/upload/automation methods", () => {
    const { service } = createService();
    const forbidden = ["click", "type", "readDom", "submit", "download", "upload", "automate", "fill", "navigate", "screenshot", "scrape"];
    for (const name of forbidden) {
      expect((service as unknown as Record<string, unknown>)[name], name).toBeUndefined();
    }
  });
});
