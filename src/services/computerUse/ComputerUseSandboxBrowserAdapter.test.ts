import { describe, expect, it } from "vitest";
import { ComputerUseInMemoryMissionTapeSink } from "./ComputerUseInMemoryMissionTapeSink";
import { ComputerUseRuntimeEventBridge } from "./ComputerUseRuntimeEventBridge";
import { ComputerUseSandboxBrowserAdapter } from "./ComputerUseSandboxBrowserAdapter";

const validRequest = {
  lane: "sandbox_browser" as const,
  action: { type: "click" as const, reason: "open page", requiresGuardApproval: false },
  context: { missionId: "mission-sb", stepId: "step-sb", traceId: "trace-sb", source: "mission" as const },
};

describe("ComputerUseSandboxBrowserAdapter", () => {
  it("maps click/type_text/observe explicitly and does not fallback unknown to click", async () => {
    const adapter = new ComputerUseSandboxBrowserAdapter({ featureFlags: { sandboxBrowserAdapterEnabled: true } });

    const click = await adapter.execute(validRequest);
    expect(click.metadata.mappedTargetRequest?.action).toBe("click");
    expect(click.metadata.browserRuntimeRouterBridgeEnabled).toBe(false);
    expect(click.metadata.routerBridgeRequest).toBeUndefined();

    const typed = await adapter.execute({
      ...validRequest,
      action: { type: "type_text", reason: "type", requiresGuardApproval: false, text: "hello" },
    });
    expect(typed.status).toBe("executed");
    expect(typed.metadata.mappedTargetRequest?.action).toBe("type");

    const observed = await adapter.execute({
      ...validRequest,
      action: { type: "observe", reason: "observe", requiresGuardApproval: false },
    });
    expect(observed.metadata.mappedTargetRequest?.action).toBe("extract");

    const unsupported = await adapter.execute({
      ...validRequest,
      action: { type: "hotkey", reason: "unsupported", requiresGuardApproval: false },
    });
    expect(unsupported.status).toBe("failed");
    expect(unsupported.metadata.reason).toContain("Hotkey is rejected");
  });

  it("wait/scroll are explicit no-op mappings to extract-compatible simulated route", async () => {
    const adapter = new ComputerUseSandboxBrowserAdapter({ featureFlags: { sandboxBrowserAdapterEnabled: true } });
    const wait = await adapter.execute({ ...validRequest, action: { type: "wait", reason: "wait", requiresGuardApproval: false } });
    const scroll = await adapter.execute({ ...validRequest, action: { type: "scroll", reason: "scroll", requiresGuardApproval: false } });
    expect(wait.status).toBe("executed");
    expect(scroll.status).toBe("executed");
    expect(wait.metadata.mappedTargetRequest?.action).toBe("extract");
    expect(scroll.metadata.mappedTargetRequest?.action).toBe("extract");
  });

  it("rejects without sandbox feature flag", async () => {
    const adapter = new ComputerUseSandboxBrowserAdapter();
    expect(adapter.canHandle(validRequest)).toBe(false);
    const result = await adapter.execute(validRequest);
    expect(result.status).toBe("failed");
    expect(result.metadata.requiresExplicitOptIn).toBe(true);
  });

  it("accepts only sandbox lane when enabled", async () => {
    const adapter = new ComputerUseSandboxBrowserAdapter({ featureFlags: { sandboxBrowserAdapterEnabled: true } });
    expect(adapter.canHandle(validRequest)).toBe(true);
    expect(adapter.canHandle({ ...validRequest, lane: "ghost_browser" })).toBe(false);
  });

  it("rejects non-sandbox lanes and malformed actions safely", async () => {
    const adapter = new ComputerUseSandboxBrowserAdapter({ featureFlags: { enableSandboxBrowserAdapter: true } });
    await expect(adapter.execute({ ...validRequest, lane: "authenticated_direct_host" })).resolves.toMatchObject({ status: "failed" });
    await expect(adapter.execute({ lane: "sandbox_browser", action: undefined })).resolves.toMatchObject({ status: "failed" });
  });

  it("preserves mission context and records completed event", async () => {
    const eventBridge = new ComputerUseRuntimeEventBridge({ tapeSink: new ComputerUseInMemoryMissionTapeSink() });
    const adapter = new ComputerUseSandboxBrowserAdapter({
      featureFlags: { sandboxBrowserAdapterEnabled: true },
      recording: { eventBridge },
    });
    const result = await adapter.execute(validRequest);
    expect(result.status).toBe("executed");
    const records = eventBridge.getSnapshot("mission-sb").records;
    expect(records.map((x) => x.eventType)).toEqual(["computer_use_browser_adapter_started", "computer_use_browser_adapter_completed"]);
    expect(records[1].payload.traceId).toBe("trace-sb");
  });

  it("returns simulated mapped target metadata and forbids real execution", async () => {
    const adapter = new ComputerUseSandboxBrowserAdapter({ featureFlags: { sandboxBrowserAdapterEnabled: true } });
    const result = await adapter.execute(validRequest);
    expect(result.status).toBe("executed");
    expect(result.metadata.adapterKind).toBe("sandbox_browser_scaffold");
    expect(result.metadata.playwrightCalled).toBe(false);
    expect(result.metadata.browserApisCalled).toBe(false);
    expect(result.metadata.systemApisCalled).toBe(false);
    expect(result.metadata.directHostAllowed).toBe(false);
    expect(result.metadata.realBrowserExecutionEnabled).toBe(false);
    expect(result.metadata.browserRuntimeRouterImported).toBe(false);
    expect(result.metadata.browserRuntimeRouterCalled).toBe(false);
    expect(result.metadata.mappedTargetRequest?.preferredLane).toBe("sandbox_browser");
  });

  it("adds router bridge request metadata only when router bridge flag is enabled", async () => {
    const adapter = new ComputerUseSandboxBrowserAdapter({
      featureFlags: { sandboxBrowserAdapterEnabled: true, browserRuntimeRouterBridgeEnabled: true },
    });
    // Router bridge validation requires a target (selector/description).
    const result = await adapter.execute({
      ...validRequest,
      action: {
        ...validRequest.action,
        target: { selectorHint: "#save", description: "Save" },
      },
    });
    expect(result.status).toBe("executed");
    expect(result.metadata.browserRuntimeRouterBridgeEnabled).toBe(true);
    expect(result.metadata.routerBridgeRequest?.action).toBe("click");
    expect(result.metadata.routerBridgeRequest?.metadata.browserRuntimeRouterImported).toBe(false);
    expect(result.metadata.playwrightCalled).toBe(false);
    expect(result.metadata.browserApisCalled).toBe(false);
    expect(result.metadata.systemApisCalled).toBe(false);
    expect(result.metadata.directHostAllowed).toBe(false);
  });

  it("fails safely on router bridge validation failure while preserving event recording", async () => {
    const eventBridge = new ComputerUseRuntimeEventBridge({ tapeSink: new ComputerUseInMemoryMissionTapeSink() });
    const adapter = new ComputerUseSandboxBrowserAdapter({
      featureFlags: { sandboxBrowserAdapterEnabled: true, browserRuntimeRouterBridgeEnabled: true },
      recording: { eventBridge },
    });
    // No target → bridge validation fails; record as failed (honest status).
    const result = await adapter.execute({ ...validRequest, action: { ...validRequest.action, target: undefined } });
    expect(result.status).toBe("failed");
    expect(result.metadata.reason).toContain("Missing BrowserRuntime router bridge target");
    const records = eventBridge.getSnapshot("mission-sb").records;
    expect(records.map((x) => x.eventType)).toEqual([
      "computer_use_browser_adapter_started",
      "computer_use_browser_adapter_failed",
    ]);
  });

  it("recording failure remains non-fatal and reset clears snapshot", async () => {
    const adapter = new ComputerUseSandboxBrowserAdapter({
      featureFlags: { sandboxBrowserAdapterEnabled: true },
      recording: {
        eventBridge: {
          recordBrowserAdapterStarted: () => ({ ok: false, reason: "start fail", metadata: { eventBridgeKind: "scaffold", storageWritesEnabled: false, missionTapeImported: false, systemApisCalled: false } }),
          recordBrowserAdapterResult: () => ({ ok: false, reason: "result fail", metadata: { eventBridgeKind: "scaffold", storageWritesEnabled: false, missionTapeImported: false, systemApisCalled: false } }),
        },
      },
    });
    const result = await adapter.execute(validRequest);
    expect(result.status).toBe("executed");
    expect(result.metadata.recordingFailed).toBe(true);
    expect(adapter.getSnapshot().executionCount).toBe(1);
    adapter.reset();
    expect(adapter.getSnapshot().executionCount).toBe(0);
  });
});
