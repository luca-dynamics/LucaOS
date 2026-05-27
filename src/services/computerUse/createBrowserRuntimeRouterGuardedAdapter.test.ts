import { describe, expect, it } from "vitest";
import { BrowserRuntimeRouterBridgeRequest } from "./BrowserRuntimeRouterBridge";
import { createBrowserRuntimeRouterGuardedAdapter } from "./createBrowserRuntimeRouterGuardedAdapter";

const bridgeRequest: BrowserRuntimeRouterBridgeRequest = {
  requestId: "req-factory-guarded",
  missionId: "mission-factory-guarded",
  action: "type",
  target: "input[name='q']",
  payload: {},
  issuedAt: new Date().toISOString(),
  riskLevel: "safe",
  trustTier: "untrusted",
  preferredLane: "sandbox_browser",
  hasGuardApproval: true,
  metadata: {
    bridgeKind: "browser_runtime_router_bridge_scaffold",
    sourceActionType: "type_text",
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

describe("createBrowserRuntimeRouterGuardedAdapter", () => {
  it("returns helper methods and invokes guarded shell", () => {
    const factory = createBrowserRuntimeRouterGuardedAdapter();
    const result = factory.invokeGuarded({
      featureFlags: {
        sandboxBrowserAdapterEnabled: true,
        browserRuntimeRouterBridgeEnabled: true,
        browserRuntimeRouterDryRunEnabled: true,
        realBrowserRuntimeRouterEnabled: true,
      },
      bridgeRequest,
      dryRunResult: dryRunPass,
      guardDecision: { status: "allowed", reason: "ok" },
    });

    expect(factory.adapter).toBeDefined();
    expect(result.status).toBe("ready_but_not_invoked");
    expect(factory.getSnapshot().invocationCount).toBe(1);
  });

  it("reset clears state", () => {
    const factory = createBrowserRuntimeRouterGuardedAdapter();
    factory.invokeGuarded({ featureFlags: { realBrowserRuntimeRouterEnabled: false } });
    expect(factory.getSnapshot().invocationCount).toBe(1);
    factory.reset();
    expect(factory.getSnapshot()).toMatchObject({ invocationCount: 0 });
  });
});
