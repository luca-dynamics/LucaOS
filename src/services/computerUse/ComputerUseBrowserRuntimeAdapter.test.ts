import { describe, expect, it } from "vitest";
import { ComputerUseBrowserRuntimeAdapterScaffold } from "./ComputerUseBrowserRuntimeAdapter";
import { ComputerUseInMemoryMissionTapeSink } from "./ComputerUseInMemoryMissionTapeSink";
import { ComputerUseRuntimeEventBridge } from "./ComputerUseRuntimeEventBridge";

const validRequest = {
  lane: "sandbox_browser" as const,
  action: { type: "click" as const, reason: "open page", requiresGuardApproval: false },
};

const requestWithMissionContext = {
  ...validRequest,
  context: { missionId: "mission-7", stepId: "step-7", traceId: "trace-7", source: "mission" as const },
};

describe("ComputerUseBrowserRuntimeAdapterScaffold", () => {
  it("rejects without explicit opt-in", async () => {
    const adapter = new ComputerUseBrowserRuntimeAdapterScaffold();
    expect(adapter.canHandle(validRequest)).toBe(false);
    const result = await adapter.execute(requestWithMissionContext);
    expect(result.status).toBe("failed");
    expect(result.metadata.requiresExplicitOptIn).toBe(true);
  });

  it("records rejected when no opt-in and recording enabled", async () => {
    const eventBridge = new ComputerUseRuntimeEventBridge({ tapeSink: new ComputerUseInMemoryMissionTapeSink() });
    const adapter = new ComputerUseBrowserRuntimeAdapterScaffold({ recording: { eventBridge } });
    const result = await adapter.execute(requestWithMissionContext);
    expect(result.status).toBe("failed");
    const records = eventBridge.getSnapshot("mission-7").records;
    expect(records.map((x) => x.eventType)).toEqual([
      "computer_use_browser_adapter_started",
      "computer_use_browser_adapter_rejected",
    ]);
    expect(records[0].payload.stepId).toBe("step-7");
  });

  it("records completed with opt-in", async () => {
    const eventBridge = new ComputerUseRuntimeEventBridge({ tapeSink: new ComputerUseInMemoryMissionTapeSink() });
    const adapter = new ComputerUseBrowserRuntimeAdapterScaffold({ featureFlags: { browserRuntimeEnabled: true }, recording: { eventBridge } });
    const result = await adapter.execute(requestWithMissionContext);
    expect(result.status).toBe("executed");
    const records = eventBridge.getSnapshot("mission-7").records;
    expect(records.map((x) => x.eventType)).toEqual([
      "computer_use_browser_adapter_started",
      "computer_use_browser_adapter_completed",
    ]);
    expect(records[1].payload.traceId).toBe("trace-7");
    expect(records[1].payload.source).toBe("mission");
  });

  it("recording failure does not break execution", async () => {
    const adapter = new ComputerUseBrowserRuntimeAdapterScaffold({
      featureFlags: { browserRuntimeEnabled: true },
      recording: {
        eventBridge: {
          recordBrowserAdapterStarted: () => ({ ok: false, reason: "start fail", metadata: { eventBridgeKind: "scaffold", storageWritesEnabled: false, missionTapeImported: false, systemApisCalled: false } }),
          recordBrowserAdapterResult: () => ({ ok: false, reason: "result fail", metadata: { eventBridgeKind: "scaffold", storageWritesEnabled: false, missionTapeImported: false, systemApisCalled: false } }),
        },
      },
    });
    const result = await adapter.execute(validRequest);
    expect(result.status).toBe("executed");
    expect(result.metadata.recordingAttempted).toBe(true);
    expect(result.metadata.recordingFailed).toBe(true);
  });

  it("falls back to unknown missionId when context is missing", async () => {
    const eventBridge = new ComputerUseRuntimeEventBridge({ tapeSink: new ComputerUseInMemoryMissionTapeSink() });
    const adapter = new ComputerUseBrowserRuntimeAdapterScaffold({ featureFlags: { browserRuntimeEnabled: true }, recording: { eventBridge } });
    await adapter.execute(validRequest);
    expect(eventBridge.getSnapshot("unknown").records.length).toBe(2);
  });

  it("metadata reports no browser/system side effects", async () => {
    const adapter = new ComputerUseBrowserRuntimeAdapterScaffold({ featureFlags: { browserRuntimeEnabled: true } });
    const result = await adapter.execute(validRequest);
    expect(result.metadata.browserRuntimeImported).toBe(false);
    expect(result.metadata.playwrightCalled).toBe(false);
    expect(result.metadata.browserApisCalled).toBe(false);
    expect(result.metadata.systemApisCalled).toBe(false);
  });
});
