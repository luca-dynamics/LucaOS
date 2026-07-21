import { describe, expect, it } from "vitest";
import { MissionTapeRecorderService } from "./MissionTapeRecorder";
import { attachMissionTapeReceipt } from "./attachMissionTapeReceipt";

describe("attachMissionTapeReceipt", () => {
  it("appends verification row with receipt id", async () => {
    const recorder = new MissionTapeRecorderService();
    await recorder.createTape("m-receipt", "attach evidence");
    await recorder.appendStep("m-receipt", {
      stepId: "s1",
      goal: "do thing",
      status: "executed",
    });

    const result = await attachMissionTapeReceipt(recorder, {
      missionId: "m-receipt",
      stepId: "s1",
      summary: "step evidence",
      evidence: [{ kind: "log", summary: "tool ok" }],
    });

    expect(result.ok).toBe(true);
    expect(result.receipt.id).toBeTruthy();
    const tape = await recorder.getTape("m-receipt");
    expect(
      tape?.verification.some((v) => v.details?.includes(result.receipt.id)),
    ).toBe(true);
  });
});
