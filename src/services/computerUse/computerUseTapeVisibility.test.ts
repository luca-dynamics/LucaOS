import { describe, expect, it } from "vitest";
import { createComputerUseRuntime } from "./createComputerUseRuntime";
import { resolveMissionTapeCompletion } from "./createComputerUseRuntime";
import { missionControlService } from "../agent/MissionControlService";
import { sharedMissionTapeRecorder } from "../missionTape/sharedMissionTapeRecorder";
import { recordMissionCheckpoint } from "../missionTape/missionTapeCheckpoint";

/**
 * MissionTapeRecorderService keeps tapes in a per-instance in-memory Map, so a
 * producer that builds its own recorder writes to a world no reader can see.
 * A computer-use run recorded its tape privately while Mission Center read
 * MissionControlService's — the run was recorded and simultaneously invisible.
 */
describe("computer-use mission tape visibility", () => {
  it("defaults the runtime recorder to the shared tape", () => {
    const completion = resolveMissionTapeCompletion({});
    expect(completion?.recorder).toBe(sharedMissionTapeRecorder);
  });

  it("writes where MissionControlService reads", async () => {
    const runtime = createComputerUseRuntime();
    expect(runtime.missionRunner).toBeDefined();

    // What Mission Center reads.
    const readerRecorder = missionControlService.getMissionTapeRecorder();
    expect(readerRecorder).toBe(sharedMissionTapeRecorder);

    await recordMissionCheckpoint({
      missionId: "cu-visible-1",
      intent: "computer-use:cu-visible-1",
      label: "computer-use start",
    });

    const seenByReader = await readerRecorder.getTape("cu-visible-1");
    expect(seenByReader).not.toBeNull();
    expect(seenByReader?.steps.length).toBeGreaterThan(0);
  });

  it("still honours an explicitly injected recorder", async () => {
    const { MissionTapeRecorderService } = await import(
      "../missionTape/MissionTapeRecorder"
    );
    const isolated = new MissionTapeRecorderService();
    const completion = resolveMissionTapeCompletion({
      missionTapeCompletion: { recorder: isolated, completeAfterRun: false },
    });
    expect(completion?.recorder).toBe(isolated);
    expect(completion?.recorder).not.toBe(sharedMissionTapeRecorder);
  });

  it("lets callers opt out of tape completion entirely", () => {
    expect(resolveMissionTapeCompletion({ missionTapeCompletion: null })).toBeUndefined();
  });
});
