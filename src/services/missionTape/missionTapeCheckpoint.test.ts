import { describe, expect, it } from "vitest";
import { MissionTapeRecorderService } from "./MissionTapeRecorder";
import {
  getLatestMissionCheckpoint,
  listMissionCheckpoints,
  recordMissionCheckpoint,
  recordMissionRollback,
} from "./missionTapeCheckpoint";

describe("missionTapeCheckpoint", () => {
  it("records a checkpoint and lists it", async () => {
    const recorder = new MissionTapeRecorderService();
    const result = await recordMissionCheckpoint({
      missionId: "m-cp-1",
      intent: "test mission",
      label: "After setup",
      goals: [{ id: 1, description: "setup", status: "COMPLETED" }],
      recorder,
    });

    expect(result.ok).toBe(true);
    expect(result.checkpointId).toBeTruthy();
    expect(result.tape.recovery.some((r) => r.reason === "checkpoint_recorded")).toBe(
      true,
    );

    const list = listMissionCheckpoints(result.tape);
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe("After setup");
    expect(list[0].goals?.[0].description).toBe("setup");
  });

  it("rolls back to latest checkpoint", async () => {
    const recorder = new MissionTapeRecorderService();
    await recordMissionCheckpoint({
      missionId: "m-rb-1",
      label: "cp1",
      recorder,
    });
    const second = await recordMissionCheckpoint({
      missionId: "m-rb-1",
      label: "cp2",
      recorder,
    });

    const rb = await recordMissionRollback({
      missionId: "m-rb-1",
      recorder,
      reason: "retry from latest",
    });

    expect(rb.ok).toBe(true);
    expect(rb.recovered).toBe(true);
    expect(rb.checkpointId).toBe(second.checkpointId);
    expect(
      rb.tape?.recovery.some((r) => r.reason === "rollback_to_checkpoint"),
    ).toBe(true);
    expect(rb.tape?.steps.some((s) => s.status === "recovered")).toBe(true);
  });

  it("fails rollback when no checkpoint", async () => {
    const recorder = new MissionTapeRecorderService();
    await recorder.createTape("m-empty", "empty");
    const rb = await recordMissionRollback({
      missionId: "m-empty",
      recorder,
    });
    expect(rb.ok).toBe(false);
    expect(rb.recovered).toBe(false);
    expect(rb.reason).toMatch(/No checkpoints/i);
  });

  it("getLatestMissionCheckpoint returns last", async () => {
    const recorder = new MissionTapeRecorderService();
    await recordMissionCheckpoint({
      missionId: "m-late",
      label: "first",
      recorder,
    });
    await recordMissionCheckpoint({
      missionId: "m-late",
      label: "second",
      recorder,
    });
    const tape = await recorder.getTape("m-late");
    const latest = getLatestMissionCheckpoint(tape);
    expect(latest?.label).toBe("second");
  });
});
