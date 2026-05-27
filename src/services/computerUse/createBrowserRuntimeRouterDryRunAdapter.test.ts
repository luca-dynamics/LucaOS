import { describe, expect, it } from "vitest";
import { BrowserRuntimeRouterBridgeRequest } from "./BrowserRuntimeRouterBridge";
import { createBrowserRuntimeRouterDryRunAdapter } from "./createBrowserRuntimeRouterDryRunAdapter";

const request: BrowserRuntimeRouterBridgeRequest = {
  requestId: "req-factory",
  missionId: "mission-factory",
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

describe("createBrowserRuntimeRouterDryRunAdapter", () => {
  it("returns adapter helpers and preserves request fields", () => {
    const { adapter, invokeDryRun, getSnapshot } = createBrowserRuntimeRouterDryRunAdapter();
    expect(adapter).toBeDefined();
    const result = invokeDryRun(request);
    expect(result.ok).toBe(true);
    expect(result.requestId).toBe(request.requestId);
    expect(result.missionId).toBe(request.missionId);
    expect(result.action).toBe(request.action);
    expect(result.target).toBe(request.target);
    expect(getSnapshot().invocationCount).toBe(1);
  });

  it("reset clears state", () => {
    const factory = createBrowserRuntimeRouterDryRunAdapter();
    factory.invokeDryRun(request);
    expect(factory.getSnapshot().invocationCount).toBe(1);
    factory.reset();
    expect(factory.getSnapshot()).toMatchObject({ invocationCount: 0, successCount: 0, failureCount: 0 });
  });
});
