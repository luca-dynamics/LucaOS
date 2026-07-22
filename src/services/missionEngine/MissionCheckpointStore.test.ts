import { describe, expect, it } from "vitest";
import { MissionCheckpointStore } from "./MissionCheckpointStore";

describe("MissionCheckpointStore", () => {
  it("creates and lists checkpoints per mission", () => {
    const store = new MissionCheckpointStore();
    const cp = store.create({
      missionId: "m1",
      activePlanIndex: 2,
      modelRoute: "cortex:gemma-2b",
    });
    expect(cp.checkpointId).toBeTruthy();
    expect(store.list("m1")).toHaveLength(1);
    expect(store.latest("m1")?.activePlanIndex).toBe(2);
  });

  it("restores plan index from latest or id", () => {
    const store = new MissionCheckpointStore();
    const first = store.create({ missionId: "m2", activePlanIndex: 0 });
    store.create({ missionId: "m2", activePlanIndex: 3 });
    expect(store.restorePlanIndex("m2").activePlanIndex).toBe(3);
    expect(store.restorePlanIndex("m2", first.checkpointId).activePlanIndex).toBe(
      0,
    );
    expect(store.restorePlanIndex("missing").ok).toBe(false);
  });
});
