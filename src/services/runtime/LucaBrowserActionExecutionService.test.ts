import { describe, expect, it, vi } from "vitest";
import { LucaBrowserActionExecutionService } from "./LucaBrowserActionExecutionService";
import {
  LUCA_BROWSER_ACTION_EXECUTION_EVENT,
  type LucaBrowserActionKind,
  type LucaBrowserActionRequest,
  type LucaBrowserSafeControlEventDetail,
} from "../../types/lucaBrowserActions";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function makeRequest(overrides: Partial<LucaBrowserActionRequest> = {}): LucaBrowserActionRequest {
  return {
    actionRequestId: overrides.actionRequestId ?? "req:1",
    shellSessionId: overrides.shellSessionId ?? "s1",
    kind: overrides.kind ?? "propose_pause",
    title: "t",
    summary: "s",
    status: overrides.status ?? "confirmed_for_future_execution",
    riskLevel: "low",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    policyDecision: {} as any,
    provenanceIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createService(opts: {
  request?: LucaBrowserActionRequest;
  sessionStatus?: string;
  hasSession?: boolean;
  hasObservation?: boolean;
} = {}) {
  const {
    request = makeRequest(),
    sessionStatus = "open",
    hasSession = true,
    hasObservation = true,
  } = opts;

  const storage = new MemoryStorage();
  const bus = { emitEvent: vi.fn(), emit: vi.fn() };
  const queueService = { getActionRequest: vi.fn((id: string) => (id === request.actionRequestId ? request : undefined)) };
  const shellService = {
    getShellSession: vi.fn((id: string) => (hasSession ? { shellSessionId: id, status: sessionStatus } : undefined)),
    getObservationSnapshot: vi.fn(() => (hasObservation ? { observationId: "obs:1" } : undefined)),
    pauseShellSession: vi.fn(),
    resumeShellSession: vi.fn(),
    closeShellSession: vi.fn(),
    revokeShellSession: vi.fn(),
  };
  const dispatchSafeControl = vi.fn<(detail: LucaBrowserSafeControlEventDetail) => void>();
  const service = new LucaBrowserActionExecutionService(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { storage, bus, queueService, shellService, dispatchSafeControl } as any,
  );
  return { service, bus, queueService, shellService, dispatchSafeControl };
}

describe("LucaBrowserActionExecutionService", () => {
  it("executes pause/resume/close/revoke through the shell service", () => {
    const cases: Array<[LucaBrowserActionKind, keyof ReturnType<typeof createService>["shellService"]]> = [
      ["propose_pause", "pauseShellSession"],
      ["propose_resume", "resumeShellSession"],
      ["propose_close", "closeShellSession"],
      ["propose_revoke", "revokeShellSession"],
    ];
    for (const [kind, method] of cases) {
      const { service, shellService, dispatchSafeControl } = createService({ request: makeRequest({ kind }) });
      const result = service.executeConfirmedSafeLifecycleAction("req:1");
      expect(result?.status).toBe("executed");
      expect(shellService[method]).toHaveBeenCalledTimes(1);
      expect(shellService[method].mock.calls[0][0]).toBe("s1");
      expect(dispatchSafeControl).not.toHaveBeenCalled();
    }
  });

  it("dispatches a safe-control event only for back/forward/refresh", () => {
    for (const kind of ["propose_back", "propose_forward", "propose_refresh"] as LucaBrowserActionKind[]) {
      const { service, shellService, dispatchSafeControl } = createService({ request: makeRequest({ kind }) });
      const result = service.executeConfirmedSafeLifecycleAction("req:1");
      expect(result?.status).toBe("executed");
      expect(dispatchSafeControl).toHaveBeenCalledWith({ actionRequestId: "req:1", shellSessionId: "s1", kind });
      expect(shellService.pauseShellSession).not.toHaveBeenCalled();
      expect(shellService.closeShellSession).not.toHaveBeenCalled();
    }
  });

  it("does not execute waiting/unconfirmed actions", () => {
    const { service, shellService, dispatchSafeControl } = createService({
      request: makeRequest({ kind: "propose_pause", status: "waiting_user_confirmation" }),
    });
    const result = service.executeConfirmedSafeLifecycleAction("req:1");
    expect(result?.status).toBe("not_executable");
    expect(shellService.pauseShellSession).not.toHaveBeenCalled();
    expect(dispatchSafeControl).not.toHaveBeenCalled();
  });

  it("does not execute click/type/scroll (unsupported, page automation disabled)", () => {
    for (const kind of ["propose_click", "propose_type", "propose_scroll"] as LucaBrowserActionKind[]) {
      const { service, shellService, dispatchSafeControl } = createService({ request: makeRequest({ kind }) });
      const result = service.executeConfirmedSafeLifecycleAction("req:1");
      expect(result?.status).toBe("unsupported");
      expect(shellService.pauseShellSession).not.toHaveBeenCalled();
      expect(dispatchSafeControl).not.toHaveBeenCalled();
    }
  });

  it("does not execute blocked categories", () => {
    for (const kind of ["login", "payment", "read_dom", "screenshot", "execute_script"] as LucaBrowserActionKind[]) {
      const { service, shellService, dispatchSafeControl } = createService({ request: makeRequest({ kind }) });
      const result = service.executeConfirmedSafeLifecycleAction("req:1");
      expect(result?.status).toBe("blocked");
      expect(shellService.closeShellSession).not.toHaveBeenCalled();
      expect(dispatchSafeControl).not.toHaveBeenCalled();
    }
  });

  it("fails when the governed session is missing", () => {
    const { service } = createService({ request: makeRequest({ kind: "propose_pause" }), hasSession: false });
    const result = service.executeConfirmedSafeLifecycleAction("req:1");
    expect(result?.status).toBe("failed");
    expect(result?.blockedBy).toContain("missing_session");
  });

  it("fails when the governed session is closed/revoked", () => {
    const { service } = createService({ request: makeRequest({ kind: "propose_pause" }), sessionStatus: "closed" });
    const result = service.executeConfirmedSafeLifecycleAction("req:1");
    expect(result?.status).toBe("failed");
    expect(result?.blockedBy).toContain("inactive_governed_session");
  });

  it("blocks when no observation snapshot exists", () => {
    const { service } = createService({ request: makeRequest({ kind: "propose_pause" }), hasObservation: false });
    const result = service.executeConfirmedSafeLifecycleAction("req:1");
    expect(result?.status).toBe("blocked");
    expect(result?.blockedBy).toContain("missing_observation_snapshot");
  });

  it("returns undefined when the action request does not exist", () => {
    const { service } = createService();
    expect(service.executeConfirmedSafeLifecycleAction("nope")).toBeUndefined();
  });

  it("stores results, exposes get/list, and emits an audit event", () => {
    const { service, bus } = createService({ request: makeRequest({ kind: "propose_pause" }) });
    const result = service.executeConfirmedSafeLifecycleAction("req:1");
    expect(service.getExecutionResult("req:1")?.executionResultId).toBe(result?.executionResultId);
    expect(service.listExecutionResults("s1")).toHaveLength(1);
    expect(service.listExecutionResults("other")).toHaveLength(0);
    expect(bus.emit).toHaveBeenCalledWith(LUCA_BROWSER_ACTION_EXECUTION_EVENT, expect.objectContaining({ kind: "propose_pause" }));
    expect(bus.emitEvent).toHaveBeenCalled();
  });

  it("reports diagnostics with safe lifecycle enabled and page automation disabled", () => {
    const { service } = createService({ request: makeRequest({ kind: "propose_pause" }) });
    service.executeConfirmedSafeLifecycleAction("req:1");
    const diag = service.getDiagnosticsSummary();
    expect(diag.totalExecutionResults).toBe(1);
    expect(diag.executedResults).toBe(1);
    expect(diag.safeLifecycleExecutionEnabled).toBe(true);
    expect(diag.pageActionExecutionEnabled).toBe(false);
    expect(diag.humanConfirmationRequired).toBe(true);
  });

  it("marks every execution result with safety flags all false", () => {
    const { service } = createService({ request: makeRequest({ kind: "propose_refresh" }) });
    const result = service.executeConfirmedSafeLifecycleAction("req:1")!;
    expect(result.automationEnabled).toBe(false);
    expect(result.domReadEnabled).toBe(false);
    expect(result.pageContentReadEnabled).toBe(false);
    expect(result.screenshotEnabled).toBe(false);
    expect(result.ocrEnabled).toBe(false);
    expect(result.credentialsEnabled).toBe(false);
    expect(result.downloadUploadEnabled).toBe(false);
    expect(result.walletPaymentEnabled).toBe(false);
  });

  it("exposes no click/type/scroll/readDom/screenshot/ocr method", () => {
    const { service } = createService();
    const forbidden = ["click", "type", "scroll", "submit", "readDom", "executeScript", "screenshot", "ocr", "goBack", "goForward", "reload"];
    for (const name of forbidden) {
      expect((service as unknown as Record<string, unknown>)[name]).toBeUndefined();
    }
  });
});
