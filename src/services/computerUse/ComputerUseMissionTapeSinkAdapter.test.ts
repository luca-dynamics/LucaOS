import { describe, expect, it, vi } from "vitest";
import { ComputerUseMissionTapeSinkAdapter } from "./ComputerUseMissionTapeSinkAdapter";
import { ComputerUseMissionTapeSinkRecord } from "./types";

const record: ComputerUseMissionTapeSinkRecord = {
  missionId: "m1",
  timestamp: "now",
  eventType: "computer_use_dispatch_started",
  payload: { stepId: "s1" },
  metadata: { tapeSinkKind: "scaffold", eventBridgeKind: "scaffold", storageWritesEnabled: false, missionTapeImported: false, systemApisCalled: false },
};

describe("ComputerUseMissionTapeSinkAdapter", () => {
  it("does not call external sink unless explicitly enabled", async () => {
    const external = { record: vi.fn().mockResolvedValue({ ok: true }) };
    const sink = new ComputerUseMissionTapeSinkAdapter({ externalSink: external });
    sink.record(record);
    await Promise.resolve();
    expect(external.record).not.toHaveBeenCalled();
    expect(sink.getAdapterSnapshot().rejectedCount).toBe(1);
  });

  it("forwards records when enabled", async () => {
    const external = { record: vi.fn().mockResolvedValue({ ok: true }) };
    const sink = new ComputerUseMissionTapeSinkAdapter({ externalSink: external, enableExternalMissionTapeSink: true });
    sink.record(record);
    await Promise.resolve();
    expect(external.record).toHaveBeenCalledWith(record);
    expect(sink.getAdapterSnapshot().acceptedCount).toBe(1);
  });

  it("swallows external failures as non-fatal", async () => {
    const external = { record: vi.fn().mockRejectedValue(new Error("boom")) };
    const sink = new ComputerUseMissionTapeSinkAdapter({ externalSink: external, enableExternalMissionTapeSink: true });
    sink.record(record);
    await Promise.resolve();
    await Promise.resolve();
    expect(sink.listRecords()).toHaveLength(1);
    expect(sink.getAdapterSnapshot().failedCount).toBe(1);
  });

  it("snapshot/reset expose adapter-local metadata and counters", async () => {
    const external = { record: vi.fn().mockResolvedValue({ ok: false, reason: "nope" }), reset: vi.fn() };
    const sink = new ComputerUseMissionTapeSinkAdapter({ externalSink: external, enableExternalMissionTapeSink: true });
    sink.record(record);
    await Promise.resolve();
    const snapshot = sink.getAdapterSnapshot("m1");
    expect(snapshot.metadata.systemApisCalled).toBe(false);
    expect(snapshot.lastResult?.ok).toBe(false);
    expect(snapshot.forwardedCount).toBe(1);
    sink.reset();
    expect(sink.getAdapterSnapshot().forwardedCount).toBe(0);
    expect(external.reset).toHaveBeenCalledTimes(1);
  });
});
