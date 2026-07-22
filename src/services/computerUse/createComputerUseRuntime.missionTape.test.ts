import { describe, expect, it } from "vitest";
import {
  createComputerUseRuntime,
  resolveMissionTapeCompletion,
} from "./createComputerUseRuntime";
import { MissionTapeRecorderService } from "../missionTape/MissionTapeRecorder";

describe("createComputerUseRuntime mission tape defaults", () => {
  it("defaults missionTapeCompletion on when omitted", () => {
    const resolved = resolveMissionTapeCompletion({});
    expect(resolved?.recorder).toBeInstanceOf(MissionTapeRecorderService);
    expect(resolved?.completeAfterRun).toBe(true);
  });

  it("allows explicit opt-out with null", () => {
    expect(resolveMissionTapeCompletion({ missionTapeCompletion: null })).toBeUndefined();
  });

  it("runMissionSteps produces productCompletion by default", async () => {
    const runtime = createComputerUseRuntime({
      pipelineOptions: { registerDefaultSandboxAdapter: false },
    });
    // Without a real adapter, computer_use step may still return a result shape.
    const result = await runtime.runMissionSteps([
      {
        missionId: "cu-default-1",
        stepId: "s1",
        kind: "computer_use",
      } as any,
    ]);
    expect(result.productCompletion).toBeDefined();
    expect(result.productCompletion?.source).toBe("product_mission_completion");
  });
});
