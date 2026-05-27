import { describe, expect, it, vi } from "vitest";
import { BrowserRuntimeRouterDryRunAdapter } from "./BrowserRuntimeRouterDryRunAdapter";
import { BrowserRuntimeRouterBridgeRequest } from "./BrowserRuntimeRouterBridge";

const request: BrowserRuntimeRouterBridgeRequest = {
  requestId: "req-1",
  missionId: "mission-1",
  action: "click",
  target: "#submit",
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

describe("BrowserRuntimeRouterDryRunAdapter", () => {
  it("accepts valid bridge request and returns simulated result", () => {
    const adapter = new BrowserRuntimeRouterDryRunAdapter();
    const result = adapter.invoke(request);
    expect(result.ok).toBe(true);
    expect(result.requestId).toBe("req-1");
    expect(result.action).toBe("click");
    expect(result.target).toBe("#submit");
    expect(result.missionId).toBe("mission-1");
    expect(result.metadata.browserRuntimeRouterCalled).toBe(false);
    expect(result.metadata.playwrightCalled).toBe(false);
    expect(result.metadata.browserApisCalled).toBe(false);
    expect(result.metadata.systemApisCalled).toBe(false);
    expect(result.metadata.directHostAllowed).toBe(false);
  });

  it("rejects missing action/target", () => {
    const adapter = new BrowserRuntimeRouterDryRunAdapter();
    const missingAction = adapter.invoke({ ...request, action: undefined as never });
    expect(missingAction.ok).toBe(false);
    const missingTarget = adapter.invoke({ ...request, target: undefined });
    expect(missingTarget.ok).toBe(false);
  });

  it("counters and snapshot update and reset clears state", () => {
    const adapter = new BrowserRuntimeRouterDryRunAdapter({ now: () => "2026-01-01T00:00:00.000Z" });
    adapter.invoke(request);
    adapter.invoke({ ...request, target: undefined });
    const snapshot = adapter.getSnapshot();
    expect(snapshot.invocationCount).toBe(2);
    expect(snapshot.successCount).toBe(1);
    expect(snapshot.failureCount).toBe(1);
    expect(snapshot.lastInvocationAt).toBe("2026-01-01T00:00:00.000Z");
    adapter.reset();
    expect(adapter.getSnapshot()).toMatchObject({ invocationCount: 0, successCount: 0, failureCount: 0 });
  });

  it("recording failure is non-fatal", () => {
    const onEvent = vi.fn(() => {
      throw new Error("boom");
    });
    const adapter = new BrowserRuntimeRouterDryRunAdapter({ onEvent });
    const result = adapter.invoke(request);
    expect(result.ok).toBe(true);
    expect(onEvent).toHaveBeenCalled();
  });
});
