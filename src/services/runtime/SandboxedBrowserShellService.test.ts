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

describe("SandboxedBrowserShellService — navigation governance + lifecycle (PR #136)", () => {
  it("records an allowed navigation for a safe https URL and moves the session to navigating", () => {
    const { service } = createService();
    const session = service.openApprovedSafeUrl({ url: "https://example.com" });
    service.markShellOpened(session.shellSessionId);
    const nav = service.recordNavigationAttempt({
      shellSessionId: session.shellSessionId,
      toUrl: "https://example.com/docs",
      fromUrl: "https://example.com",
    });
    expect(nav.status).toBe("allowed");
    expect(nav.toAuditUrl).toBe("https://example.com/docs");
    expect(nav.source).toBe("luca_browser_webview");
    expect(service.getShellSession(session.shellSessionId)?.status).toBe("navigating");
    expect(service.getNavigationRecordsForSession(session.shellSessionId)).toHaveLength(1);
  });

  it("blocks navigation to a javascript/data/file scheme and freezes the session", () => {
    const { service, busEvents } = createService();
    const session = service.openApprovedSafeUrl({ url: "https://example.com" });
    service.markShellOpened(session.shellSessionId);
    const nav = service.recordNavigationAttempt({
      shellSessionId: session.shellSessionId,
      toUrl: "javascript:alert(1)",
    });
    expect(nav.status).toBe("blocked");
    expect(nav.blockedBy).toContain("blocked_scheme");
    expect(service.getShellSession(session.shellSessionId)?.status).toBe("navigation_blocked");
    expect(busEvents.some((e) => e.type === "sandboxed_browser_shell_navigation_blocked")).toBe(true);
  });

  it("blocks navigation to URLs with token/password/session params", () => {
    const { service } = createService();
    const session = service.openApprovedSafeUrl({ url: "https://example.com" });
    const nav = service.recordNavigationAttempt({
      shellSessionId: session.shellSessionId,
      toUrl: "https://example.com/login?token=supersecret&session=abc",
    });
    expect(nav.status).toBe("blocked");
    expect(nav.blockedBy).toContain("secret_like_params");
    expect(JSON.stringify(nav)).not.toContain("supersecret");
  });

  it("blocks navigation to wallet/payment routes", () => {
    const { service } = createService();
    const session = service.openApprovedSafeUrl({ url: "https://example.com" });
    const nav = service.recordNavigationAttempt({
      shellSessionId: session.shellSessionId,
      toUrl: "https://example.com/wallet/withdraw",
    });
    expect(nav.status).toBe("blocked");
    expect(nav.blockedBy).toContain("wallet_or_payment_route");
  });

  it("blocks navigation to download/upload routes", () => {
    const { service } = createService();
    const session = service.openApprovedSafeUrl({ url: "https://example.com" });
    const nav = service.recordNavigationAttempt({
      shellSessionId: session.shellSessionId,
      toUrl: "https://example.com/download/report.zip",
    });
    expect(nav.status).toBe("blocked");
    expect(nav.blockedBy).toContain("download_or_upload_route");
  });

  it("stores only redacted audit URLs in navigation records (no raw query/hash)", () => {
    const { service } = createService();
    const session = service.openApprovedSafeUrl({ url: "https://example.com" });
    const nav = service.recordNavigationAttempt({
      shellSessionId: session.shellSessionId,
      toUrl: "https://example.com/page?ref=campaign123#frag",
    });
    expect(nav.status).toBe("allowed");
    expect(nav.toAuditUrl).toBe("https://example.com/page?[redacted]#[redacted]");
    expect(JSON.stringify(nav)).not.toContain("campaign123");
  });

  it("markNavigationBlocked records a blocked record and freezes the session", () => {
    const { service } = createService();
    const session = service.openApprovedSafeUrl({ url: "https://example.com" });
    service.markShellOpened(session.shellSessionId);
    const nav = service.markNavigationBlocked(session.shellSessionId, "Blocked by governance.", "https://evil.test/wallet");
    expect(nav.status).toBe("blocked");
    expect(nav.source).toBe("system");
    expect(service.getShellSession(session.shellSessionId)?.status).toBe("navigation_blocked");
  });

  it("pauseShellSession and resumeShellSession update status and metadata", () => {
    const { service } = createService();
    const session = service.openApprovedSafeUrl({ url: "https://example.com" });
    service.markShellOpened(session.shellSessionId);
    const paused = service.pauseShellSession(session.shellSessionId, "Paused from Luca Browser.");
    expect(paused?.status).toBe("paused");
    expect(paused?.metadata.pauseReason).toBe("Paused from Luca Browser.");
    const resumed = service.resumeShellSession(session.shellSessionId);
    expect(resumed?.status).toBe("open");
  });

  it("markShellNavigating/markShellSettled transition transient state only", () => {
    const { service } = createService();
    const session = service.openApprovedSafeUrl({ url: "https://example.com" });
    service.markShellOpened(session.shellSessionId);
    expect(service.markShellNavigating(session.shellSessionId)?.status).toBe("navigating");
    expect(service.markShellSettled(session.shellSessionId)?.status).toBe("open");
    // Settling a paused session does nothing.
    service.pauseShellSession(session.shellSessionId);
    expect(service.markShellSettled(session.shellSessionId)?.status).toBe("paused");
  });

  it("diagnostics include navigation counts", () => {
    const { service } = createService();
    const session = service.openApprovedSafeUrl({ url: "https://example.com" });
    service.recordNavigationAttempt({ shellSessionId: session.shellSessionId, toUrl: "https://example.com/a" });
    service.recordNavigationAttempt({ shellSessionId: session.shellSessionId, toUrl: "javascript:alert(1)" });
    const diag = service.getDiagnosticsSummary();
    expect(diag.navigationEvents).toBe(2);
    expect(diag.allowedNavigations).toBe(1);
    expect(diag.blockedNavigations).toBe(1);
    expect(diag.navigationGovernanceEnabled).toBe(true);
    expect(diag.lastNavigationAt).toBeTruthy();
  });

  it("bounds navigation records to the maximum and never resurrects closed sessions", () => {
    const { service } = createService();
    const session = service.openApprovedSafeUrl({ url: "https://example.com" });
    service.closeShellSession(session.shellSessionId);
    const nav = service.recordNavigationAttempt({ shellSessionId: session.shellSessionId, toUrl: "https://example.com/a" });
    expect(nav.status).toBe("allowed");
    // A closed session must NOT be reactivated by an allowed navigation.
    expect(service.getShellSession(session.shellSessionId)?.status).toBe("closed");
  });
});
