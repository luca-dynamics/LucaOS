import { describe, expect, it, vi } from "vitest";
import { BrowserRuntimeRouterGuardedAdapter } from "./BrowserRuntimeRouterGuardedAdapter";
import { BrowserRuntimeRouterBridgeRequest } from "./BrowserRuntimeRouterBridge";

const bridgeRequest: BrowserRuntimeRouterBridgeRequest = {
  requestId: "req-guarded-1",
  missionId: "mission-guarded-1",
  action: "click",
  target: "#confirm",
  payload: {},
  issuedAt: new Date().toISOString(),
  riskLevel: "safe",
  trustTier: "untrusted",
  preferredLane: "sandbox_browser",
  hasGuardApproval: true,
  metadata: {
    bridgeKind: "browser_runtime_router_bridge_scaffold",
    sourceActionType: "click",
    sourceDisposition: "mapped",
    sourceConformanceReason: "ok",
    realBrowserExecutionEnabled: false,
    browserRuntimeRouterImported: false,
    playwrightCalled: false,
    browserApisCalled: false,
    systemApisCalled: false,
    directHostAllowed: false,
    requiresExplicitOptIn: true,
  },
};

const dryRunPass = { ok: true, metadata: { adapterKind: "browser_runtime_router_dry_run", dryRun: true, realBrowserExecutionEnabled: false, browserRuntimeRouterImported: false, browserRuntimeRouterInstantiated: false, browserRuntimeRouterCalled: false, playwrightCalled: false, browserApisCalled: false, systemApisCalled: false, directHostAllowed: false, requiresExplicitOptIn: true } };

const baseInput = {
  featureFlags: {
    sandboxBrowserAdapterEnabled: true,
    browserRuntimeRouterBridgeEnabled: true,
    browserRuntimeRouterDryRunEnabled: true,
    realBrowserRuntimeRouterEnabled: true,
  },
  bridgeRequest,
  dryRunResult: dryRunPass,
  guardDecision: { status: "allowed" as const, reason: "ok" },
};

describe("BrowserRuntimeRouterGuardedAdapter", () => {
  it("blocked when guard blocks", () => {
    const adapter = new BrowserRuntimeRouterGuardedAdapter();
    expect(adapter.invoke({ ...baseInput, guardDecision: { status: "denied", reason: "no" } }).status).toBe("blocked");
  });

  it("dry_run_required when dry-run missing", () => {
    const adapter = new BrowserRuntimeRouterGuardedAdapter();
    expect(adapter.invoke({ ...baseInput, dryRunResult: undefined }).status).toBe("dry_run_required");
  });

  it("needs_confirmation when guard requires confirmation", () => {
    const adapter = new BrowserRuntimeRouterGuardedAdapter();
    expect(adapter.invoke({ ...baseInput, guardDecision: { status: "needs_confirmation", reason: "approve" } }).status).toBe("needs_confirmation");
  });

  it("ready becomes ready_but_not_invoked and never executes real runtime", () => {
    const adapter = new BrowserRuntimeRouterGuardedAdapter();
    const result = adapter.invoke(baseInput);
    expect(result.status).toBe("ready_but_not_invoked");
    expect(result.readinessStatus).toBe("ready");
    expect(result.metadata).toMatchObject({
      adapterKind: "browser_runtime_router_guarded_shell",
      shellOnly: true,
      realBrowserExecutionEnabled: false,
      browserRuntimeRouterImported: false,
      browserRuntimeRouterInstantiated: false,
      browserRuntimeRouterCalled: false,
      playwrightCalled: false,
      browserApisCalled: false,
      systemApisCalled: false,
      directHostAllowed: false,
      requiresExplicitOptIn: true,
    });
  });

  it("counters/snapshot update and reset clears counters", () => {
    const adapter = new BrowserRuntimeRouterGuardedAdapter({ now: () => "2026-01-01T00:00:00.000Z" });
    adapter.invoke({ ...baseInput, guardDecision: { status: "denied", reason: "no" } });
    adapter.invoke({ ...baseInput, dryRunResult: undefined });
    adapter.invoke({ ...baseInput, guardDecision: { status: "needs_confirmation", reason: "approve" } });
    adapter.invoke(baseInput);

    const snapshot = adapter.getSnapshot();
    expect(snapshot.invocationCount).toBe(4);
    expect(snapshot.blockedCount).toBe(1);
    expect(snapshot.dryRunRequiredCount).toBe(1);
    expect(snapshot.needsConfirmationCount).toBe(1);
    expect(snapshot.readyButNotInvokedCount).toBe(1);
    expect(snapshot.lastInvocationAt).toBe("2026-01-01T00:00:00.000Z");

    adapter.reset();
    expect(adapter.getSnapshot()).toMatchObject({
      invocationCount: 0,
      blockedCount: 0,
      dryRunRequiredCount: 0,
      needsConfirmationCount: 0,
      readyButNotInvokedCount: 0,
    });
  });

  it("event recording failure is non-fatal", () => {
    const onEvent = vi.fn(() => {
      throw new Error("boom");
    });
    const adapter = new BrowserRuntimeRouterGuardedAdapter({ onEvent });
    const result = adapter.invoke(baseInput);
    expect(result.status).toBe("ready_but_not_invoked");
    expect(onEvent).toHaveBeenCalled();
  });
});
