import { describe, expect, it, vi } from "vitest";
import { ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { ApprovalRequestCenterService } from "../provenance/ApprovalRequestCenterService";
import { GovernedActionRequestService } from "./GovernedActionRequestService";
import { GovernedToolExecutionService } from "./GovernedToolExecutionService";
import { SAFE_URL_BROWSER_TARGET } from "./GovernedToolExecutionPolicy";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function createStack() {
  const storage = new MemoryStorage();
  const provenance = new ProvenanceGateService(storage);
  const inbox = {
    ingestEvent: vi.fn((event: unknown) => ({ inboxEventId: `inbox:${Math.random()}`, ...(event as Record<string, unknown>) })),
    getUnreadCount: vi.fn(() => 0),
    getDiagnosticsSummary: vi.fn(() => ({ totalEvents: 0, unreadEvents: 0, archivedEvents: 0, externalInertEvents: 0, approvalEvents: 0 })),
  };
  const approvals = new ApprovalRequestCenterService({ storage, provenance, inbox });
  const requests = new GovernedActionRequestService({ storage, provenance, approvals, inbox });
  const bus = { emitEvent: vi.fn(), emit: vi.fn() };
  const browserShell = {
    openApprovedSafeUrl: vi.fn((input: { url: string }) => ({
      shellSessionId: "shell:test",
      status: "open_requested",
      auditUrl: input.url,
      normalizedUrl: input.url,
    })),
  };
  const executionService = new GovernedToolExecutionService({
    storage, requests, approvals, provenance, inbox, bus, browserShell,
  });
  return { provenance, approvals, requests, executionService, browserShell };
}

function createSafeUrlRequest(
  stack: ReturnType<typeof createStack>,
  opts: { url: string; riskLevel?: "low" | "medium" | "high"; target?: string; approve?: boolean },
) {
  const prov = stack.provenance.createProvenanceRecord({
    sourceType: "tool_action", sourceId: "test", sourceTrustLevel: "local", createdBy: "test",
  });
  const request = stack.requests.createRequest({
    kind: "tool",
    title: "Open approved safe URL",
    description: "Open a safe URL in the Luca sandbox browser shell",
    requestedCapability: "open_approved_safe_url",
    target: opts.target ?? SAFE_URL_BROWSER_TARGET,
    parametersPreview: { safeUrl: opts.url },
    provenanceIds: [prov.provenanceId],
    riskLevel: opts.riskLevel ?? "low",
  });
  if (opts.approve ?? true) {
    stack.approvals.approveOnce(request.approvalRequestId!);
    stack.requests.markApprovedWaitingExecution(request.requestId);
  }
  return request;
}

describe("GovernedToolExecution — open_approved_safe_url", () => {
  it("allows an approved safe URL and executes via the shell service only", () => {
    const stack = createStack();
    const request = createSafeUrlRequest(stack, { url: "https://example.com" });

    const canExec = stack.executionService.canExecuteRequest(request.requestId);
    expect(canExec.allowed).toBe(true);
    expect(canExec.capability).toBe("open_approved_safe_url");

    const result = stack.executionService.executeApprovedRequest(request.requestId);
    expect(result.status).toBe("succeeded");
    expect(stack.browserShell.openApprovedSafeUrl).toHaveBeenCalledTimes(1);
    expect(stack.browserShell.openApprovedSafeUrl).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://example.com" }),
    );
    expect(result.resultSummary).toContain("browser shell");
  });

  it("blocks an unapproved safe URL request", () => {
    const stack = createStack();
    const request = createSafeUrlRequest(stack, { url: "https://example.com", approve: false });
    const canExec = stack.executionService.canExecuteRequest(request.requestId);
    expect(canExec.allowed).toBe(false);
    expect(stack.browserShell.openApprovedSafeUrl).not.toHaveBeenCalled();
  });

  it("blocks an unsafe URL even when approved", () => {
    const stack = createStack();
    const request = createSafeUrlRequest(stack, { url: "javascript:alert(1)" });
    const canExec = stack.executionService.canExecuteRequest(request.requestId);
    expect(canExec.allowed).toBe(false);
    expect(canExec.reason.toLowerCase()).toContain("safe-url validation");
  });

  it("blocks a high-risk safe-URL request", () => {
    const stack = createStack();
    const request = createSafeUrlRequest(stack, { url: "https://example.com", riskLevel: "high" });
    const canExec = stack.executionService.canExecuteRequest(request.requestId);
    expect(canExec.allowed).toBe(false);
    expect(canExec.reason.toLowerCase()).toContain("risk level is too high");
  });

  it("blocks a safe-URL request that does not target the safe-url shell", () => {
    const stack = createStack();
    const request = createSafeUrlRequest(stack, { url: "https://example.com", target: "browser:launch" });
    const canExec = stack.executionService.canExecuteRequest(request.requestId);
    expect(canExec.allowed).toBe(false);
  });
});
