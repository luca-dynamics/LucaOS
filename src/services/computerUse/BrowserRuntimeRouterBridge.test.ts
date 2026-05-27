import { describe, expect, it } from "vitest";
import {
  createBrowserRuntimeRouterBridgeRequest,
  mapComputerUseActionToBrowserRuntimeRoute,
  validateBrowserRuntimeRouterBridgeRequest,
} from "./BrowserRuntimeRouterBridge";

const baseRequest = {
  lane: "sandbox_browser" as const,
  action: {
    type: "click" as const,
    reason: "test",
    requiresGuardApproval: false,
    target: { selectorHint: "#submit", description: "Submit" },
  },
  context: {
    missionId: "mission-bridge",
    stepId: "step-bridge",
    traceId: "trace-bridge",
    source: "mission" as const,
  },
};

describe("BrowserRuntimeRouterBridge", () => {
  it("maps click/type_text/observe correctly", () => {
    expect(mapComputerUseActionToBrowserRuntimeRoute("click")).toMatchObject({ ok: true, route: "click" });
    expect(mapComputerUseActionToBrowserRuntimeRoute("type_text")).toMatchObject({ ok: true, route: "type" });
    expect(mapComputerUseActionToBrowserRuntimeRoute("observe")).toMatchObject({ ok: true, route: "extract" });
  });

  it("wait/scroll behavior follows conformance matrix", () => {
    expect(mapComputerUseActionToBrowserRuntimeRoute("wait")).toMatchObject({ ok: true, route: "extract" });
    expect(mapComputerUseActionToBrowserRuntimeRoute("scroll")).toMatchObject({ ok: true, route: "extract" });
  });

  it("hotkey and unsupported actions reject safely", () => {
    const hotkey = mapComputerUseActionToBrowserRuntimeRoute("hotkey");
    expect(hotkey.ok).toBe(false);
    const unsupported = mapComputerUseActionToBrowserRuntimeRoute("navigate");
    expect(unsupported.ok).toBe(false);
  });

  it("unknown action never maps to click", () => {
    const unknown = mapComputerUseActionToBrowserRuntimeRoute("unknown");
    expect(unknown.ok).toBe(false);
  });

  it("preserves mission context and emits scaffold metadata", () => {
    const output = createBrowserRuntimeRouterBridgeRequest(baseRequest);
    expect(output.ok).toBe(true);
    if (!output.ok) return;
    expect(output.request.missionId).toBe("mission-bridge");
    expect(output.request.metadata.stepId).toBe("step-bridge");
    expect(output.request.metadata.traceId).toBe("trace-bridge");
    expect(output.request.metadata.source).toBe("mission");
    expect(output.request.metadata.bridgeKind).toBe("browser_runtime_router_bridge_scaffold");
    expect(output.request.metadata.browserRuntimeRouterImported).toBe(false);
    expect(output.request.metadata.playwrightCalled).toBe(false);
    expect(output.request.metadata.browserApisCalled).toBe(false);
    expect(output.request.metadata.systemApisCalled).toBe(false);
    expect(output.request.metadata.directHostAllowed).toBe(false);
    expect(output.request.metadata.realBrowserExecutionEnabled).toBe(false);
  });

  it("validation catches missing action/target", () => {
    expect(validateBrowserRuntimeRouterBridgeRequest()).toMatchObject({ ok: false });
    const output = createBrowserRuntimeRouterBridgeRequest(baseRequest);
    expect(output.ok).toBe(true);
    if (!output.ok) return;
    expect(validateBrowserRuntimeRouterBridgeRequest({ ...output.request, action: undefined })).toMatchObject({ ok: false });
    expect(validateBrowserRuntimeRouterBridgeRequest({ ...output.request, target: undefined })).toMatchObject({ ok: false });
    expect(validateBrowserRuntimeRouterBridgeRequest(output.request)).toMatchObject({ ok: true });
  });

  it("does not instantiate BrowserRuntimeRouter", () => {
    const output = createBrowserRuntimeRouterBridgeRequest(baseRequest);
    expect(output.ok).toBe(true);
    if (!output.ok) return;
    expect(output.request.metadata.browserRuntimeRouterImported).toBe(false);
  });
});
