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
    expect(result.metadata.mappedTargetRequest?.preferredLane).toBe("sandbox_browser");
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
