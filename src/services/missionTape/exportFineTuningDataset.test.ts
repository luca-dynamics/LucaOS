// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ToolRegistry } from "../toolRegistry";
import { sharedMissionTapeRecorder } from "./sharedMissionTapeRecorder";

// export_fine_tuning_dataset used `new MissionTapeRecorder()` — a fresh, empty
// private store — so it always exported zero tapes. It must read the shared
// recorder that producers (completion, checkpoints, computer-use) write to.
describe("export_fine_tuning_dataset", () => {
  it("exports tapes written to the shared recorder, not an empty private one", async () => {
    await sharedMissionTapeRecorder.createTape("export-e2e-1", "ship the thing");
    await sharedMissionTapeRecorder.appendStep("export-e2e-1", {
      stepId: "s1",
      goal: "do a thing",
      status: "verified",
    });
    await sharedMissionTapeRecorder.finalizeTape("export-e2e-1", {
      status: "completed",
    });

    const result = await ToolRegistry.execute(
      "export_fine_tuning_dataset",
      { limit: 10 },
      {},
    );

    expect(result).toContain("[[DATASET_EXPORT_SUCCESS]]");
    // The regression was a permanent "Exported 0 mission tapes".
    expect(result).not.toContain("Exported 0 mission tapes");
  });
});
