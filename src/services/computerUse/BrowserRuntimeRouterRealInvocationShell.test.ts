import { describe, expect, it, vi } from "vitest";
import { BrowserRuntimeRouterRealInvocationShell } from "./BrowserRuntimeRouterRealInvocationShell";
import { BrowserRuntimeRouterBridgeRequest } from "./BrowserRuntimeRouterBridge";
import type { ComputerUseBrowserRuntimeRouterPort } from "./types";

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

const dryRunPass = {
  ok: true,
  metadata: {
    adapterKind: "browser_runtime_router_dry_run" as const,
    dryRun: true as const,
    realBrowserExecutionEnabled: false as const,
    browserRuntimeRouterImported: false as const,
    browserRuntimeRouterInstantiated: false as const,
    browserRuntimeRouterCalled: false as const,
    playwrightCalled: false as const,
    browserApisCalled: false as const,
    systemApisCalled: false as const,
    directHostAllowed: false as const,
    requiresExplicitOptIn: true as const,
  },
};

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

function createMockRouter(
  routeImpl?: ComputerUseBrowserRuntimeRouterPort["route"],
): ComputerUseBrowserRuntimeRouterPort {
  return {
    route:
      routeImpl ??
      (async () => ({
        accepted: true,
        lane: "sandbox_browser",
        runtime: "playwright",
        reason: "mock-accepted",
        execution: {
          playwrightCalled: true,
          browserApisCalled: true,
          realBrowserExecutionEnabled: true,
        },
      })),
  };
}

describe("BrowserRuntimeRouterRealInvocationShell", () => {
  it("maps guarded statuses and keeps real invocation disabled without router DI", async () => {
    const shell = new BrowserRuntimeRouterRealInvocationShell();
    expect(
      (await shell.invoke({ ...baseInput, guardDecision: { status: "denied", reason: "no" } }))
        .status,
    ).toBe("blocked");
    expect((await shell.invoke({ ...baseInput, dryRunResult: undefined })).status).toBe(
      "dry_run_required",
    );
    expect(
      (
        await shell.invoke({
          ...baseInput,
          guardDecision: { status: "needs_confirmation", reason: "approve" },
        })
      ).status,
    ).toBe("needs_confirmation");

    const readyResult = await shell.invoke(baseInput);
    expect(readyResult.status).toBe("ready_but_real_invocation_disabled");
    expect(readyResult.guardedStatus).toBe("ready_but_not_invoked");
    expect(readyResult.metadata).toMatchObject({
      adapterKind: "browser_runtime_real_invocation_shell",
      shellOnly: true,
      realBrowserExecutionEnabled: false,
      browserRuntimeRouterCalled: false,
      playwrightCalled: false,
      browserApisCalled: false,
      systemApisCalled: false,
      directHostAllowed: false,
      requiresExplicitOptIn: true,
    });
  });

  it("invokes injected router when readiness is ready", async () => {
    const route = vi.fn(async () => ({
      accepted: true,
      lane: "sandbox_browser",
      runtime: "playwright",
      reason: "routed-ok",
      execution: {
        playwrightCalled: true,
        browserApisCalled: true,
        realBrowserExecutionEnabled: true,
      },
    }));
    const shell = new BrowserRuntimeRouterRealInvocationShell({
      router: createMockRouter(route),
    });

    const result = await shell.invoke(baseInput);

    expect(result.status).toBe("invoked");
    expect(route).toHaveBeenCalledTimes(1);
    expect(route).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: bridgeRequest.requestId,
        missionId: bridgeRequest.missionId,
        action: "click",
        preferredLane: "sandbox_browser",
      }),
    );
    expect(result.metadata).toMatchObject({
      shellOnly: false,
      realBrowserExecutionEnabled: true,
      browserRuntimeRouterImported: true,
      browserRuntimeRouterInstantiated: true,
      browserRuntimeRouterCalled: true,
      playwrightCalled: true,
      browserApisCalled: true,
      systemApisCalled: false,
      directHostAllowed: false,
      routeAccepted: true,
      routeLane: "sandbox_browser",
    });
  });

  it("returns invoke_failed when router rejects", async () => {
    const shell = new BrowserRuntimeRouterRealInvocationShell({
      router: createMockRouter(async () => ({
        accepted: false,
        lane: "sandbox_browser",
        runtime: "playwright",
        reason: "adapter denied",
      })),
    });

    const result = await shell.invoke(baseInput);
    expect(result.status).toBe("invoke_failed");
    expect(result.reason).toMatch(/adapter denied/i);
    expect(result.metadata.browserRuntimeRouterCalled).toBe(true);
    expect(result.metadata.routeAccepted).toBe(false);
  });

  it("returns invoke_failed when router throws", async () => {
    const shell = new BrowserRuntimeRouterRealInvocationShell({
      router: createMockRouter(async () => {
        throw new Error("boom");
      }),
    });

    const result = await shell.invoke(baseInput);
    expect(result.status).toBe("invoke_failed");
    expect(result.reason).toMatch(/boom/);
  });

  it("never calls router when gates fail", async () => {
    const route = vi.fn(async () => ({
      accepted: true,
      lane: "sandbox_browser",
      runtime: "playwright",
    }));
    const shell = new BrowserRuntimeRouterRealInvocationShell({
      router: createMockRouter(route),
    });

    await shell.invoke({ ...baseInput, guardDecision: { status: "denied", reason: "no" } });
    expect(route).not.toHaveBeenCalled();
  });

  it("snapshot counters update and reset clears counters", async () => {
    const shell = new BrowserRuntimeRouterRealInvocationShell({
      now: () => "2026-01-01T00:00:00.000Z",
      router: createMockRouter(),
    });
    await shell.invoke({ ...baseInput, guardDecision: { status: "denied", reason: "no" } });
    await shell.invoke({ ...baseInput, dryRunResult: undefined });
    await shell.invoke({
      ...baseInput,
      guardDecision: { status: "needs_confirmation", reason: "approve" },
    });
    await shell.invoke(baseInput);

    const snapshot = shell.getSnapshot();
    expect(snapshot.invocationCount).toBe(4);
    expect(snapshot.blockedCount).toBe(1);
    expect(snapshot.dryRunRequiredCount).toBe(1);
    expect(snapshot.needsConfirmationCount).toBe(1);
    expect(snapshot.invokedCount).toBe(1);
    expect(snapshot.lastInvocationAt).toBe("2026-01-01T00:00:00.000Z");

    shell.reset();
    expect(shell.getSnapshot()).toMatchObject({
      invocationCount: 0,
      blockedCount: 0,
      dryRunRequiredCount: 0,
      needsConfirmationCount: 0,
      readyButRealInvocationDisabledCount: 0,
      invokedCount: 0,
      invokeFailedCount: 0,
    });
  });

  it("event recording failure is non-fatal", async () => {
    const onEvent = vi.fn(() => {
      throw new Error("boom");
    });
    const shell = new BrowserRuntimeRouterRealInvocationShell({ onEvent });
    const result = await shell.invoke(baseInput);
    expect(result.status).toBe("ready_but_real_invocation_disabled");
    expect(onEvent).toHaveBeenCalled();
  });
});
