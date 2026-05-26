import { describe, expect, it } from "vitest";
import { ComputerUseInMemoryMissionTapeSink } from "./ComputerUseInMemoryMissionTapeSink";
import { ComputerUseRuntimeEventBridge } from "./ComputerUseRuntimeEventBridge";

describe("ComputerUseRuntimeEventBridge", () => {
  it("records started/completed/rejected events", () => {
    const bridge = new ComputerUseRuntimeEventBridge({ tapeSink: new ComputerUseInMemoryMissionTapeSink(), now: () => "now" });
    bridge.recordDispatchStarted({ missionId: "m1", stepId: "s1", kind: "computer_use" });
    bridge.recordIntegrationResult({ ok: true, step: { missionId: "m1", stepId: "s1", kind: "computer_use" }, reason: "ok", metadata: { integrationKind: "scaffold", systemApisCalled: false, missionEngineImported: false, requiresExplicitOptIn: true } });
    bridge.recordIntegrationResult({ ok: false, step: { missionId: "m1", stepId: "s2", kind: "computer_use" }, reason: "no", metadata: { integrationKind: "scaffold", systemApisCalled: false, missionEngineImported: false, requiresExplicitOptIn: true } });
    expect(bridge.getSnapshot("m1").records.map((x) => x.eventType)).toEqual([
      "computer_use_dispatch_started",
      "computer_use_dispatch_completed",
      "computer_use_dispatch_rejected",
    ]);
  });

  it("redacts sensitive text payload fields", () => {
    const bridge = new ComputerUseRuntimeEventBridge({ tapeSink: new ComputerUseInMemoryMissionTapeSink() });
    bridge.recordStepResult({ missionId: "m1", stepId: "s1", kind: "computer_use", status: "completed", reason: "ok", metadata: { adapterKind: "scaffold", systemApisCalled: false, stepId: "s1" }, pipelineResult: undefined });
    const record = bridge.getSnapshot("m1").records[0];
    expect(record.payload.reason).toBe("ok");
  });
});
