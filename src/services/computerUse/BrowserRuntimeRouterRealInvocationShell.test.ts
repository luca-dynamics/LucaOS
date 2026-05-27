import { describe, expect, it, vi } from "vitest";
import { BrowserRuntimeRouterRealInvocationShell } from "./BrowserRuntimeRouterRealInvocationShell";
import { BrowserRuntimeRouterBridgeRequest } from "./BrowserRuntimeRouterBridge";

const bridgeRequest: BrowserRuntimeRouterBridgeRequest = {
  requestId: "req-real-shell-1",
  missionId: "mission-real-shell-1",
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

describe("BrowserRuntimeRouterRealInvocationShell", () => {
  it("maps guarded statuses and keeps real invocation disabled", () => {
    const shell = new BrowserRuntimeRouterRealInvocationShell();
    expect(shell.invoke({ ...baseInput, guardDecision: { status: "denied", reason: "no" } }).status).toBe("blocked");
    expect(shell.invoke({ ...baseInput, dryRunResult: undefined }).status).toBe("dry_run_required");
    expect(shell.invoke({ ...baseInput, guardDecision: { status: "needs_confirmation", reason: "approve" } }).status).toBe("needs_confirmation");

    const readyResult = shell.invoke(baseInput);
    expect(readyResult.status).toBe("ready_but_real_invocation_disabled");
    expect(readyResult.guardedStatus).toBe("ready_but_not_invoked");
    expect(readyResult.metadata).toMatchObject({
      adapterKind: "browser_runtime_real_invocation_shell",
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

  it("snapshot counters update and reset clears counters", () => {
    const shell = new BrowserRuntimeRouterRealInvocationShell({ now: () => "2026-01-01T00:00:00.000Z" });
    shell.invoke({ ...baseInput, guardDecision: { status: "denied", reason: "no" } });
    shell.invoke({ ...baseInput, dryRunResult: undefined });
    shell.invoke({ ...baseInput, guardDecision: { status: "needs_confirmation", reason: "approve" } });
    shell.invoke(baseInput);

    const snapshot = shell.getSnapshot();
    expect(snapshot.invocationCount).toBe(4);
    expect(snapshot.blockedCount).toBe(1);
    expect(snapshot.dryRunRequiredCount).toBe(1);
    expect(snapshot.needsConfirmationCount).toBe(1);
    expect(snapshot.readyButRealInvocationDisabledCount).toBe(1);
    expect(snapshot.lastInvocationAt).toBe("2026-01-01T00:00:00.000Z");

    shell.reset();
    expect(shell.getSnapshot()).toMatchObject({
      invocationCount: 0,
      blockedCount: 0,
      dryRunRequiredCount: 0,
      needsConfirmationCount: 0,
      readyButRealInvocationDisabledCount: 0,
    });
  });

  it("event recording failure is non-fatal", () => {
    const onEvent = vi.fn(() => {
      throw new Error("boom");
    });
    const shell = new BrowserRuntimeRouterRealInvocationShell({ onEvent });
    const result = shell.invoke(baseInput);
    expect(result.status).toBe("ready_but_real_invocation_disabled");
    expect(onEvent).toHaveBeenCalled();
  });
});
