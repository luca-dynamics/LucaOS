import { describe, expect, it } from "vitest";
import { ComputerUseInMemoryMissionTapeSink } from "./ComputerUseInMemoryMissionTapeSink";

describe("ComputerUseInMemoryMissionTapeSink", () => {
  it("records events and filters by missionId", () => {
    const sink = new ComputerUseInMemoryMissionTapeSink();
    sink.record({ missionId: "m1", timestamp: "t1", eventType: "computer_use_dispatch_started", payload: {}, metadata: { tapeSinkKind: "scaffold", eventBridgeKind: "scaffold", storageWritesEnabled: false, missionTapeImported: false, systemApisCalled: false } });
    sink.record({ missionId: "m2", timestamp: "t2", eventType: "computer_use_dispatch_completed", payload: {}, metadata: { tapeSinkKind: "scaffold", eventBridgeKind: "scaffold", storageWritesEnabled: false, missionTapeImported: false, systemApisCalled: false } });
    expect(sink.listRecords()).toHaveLength(2);
    expect(sink.listRecords("m1")).toHaveLength(1);
  });

  it("reset clears records", () => {
    const sink = new ComputerUseInMemoryMissionTapeSink();
    sink.record({ missionId: "m1", timestamp: "t1", eventType: "computer_use_dispatch_started", payload: {}, metadata: { tapeSinkKind: "scaffold", eventBridgeKind: "scaffold", storageWritesEnabled: false, missionTapeImported: false, systemApisCalled: false } });
    sink.reset();
    expect(sink.getSnapshot().records).toEqual([]);
  });
});
