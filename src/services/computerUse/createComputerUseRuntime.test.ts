import { describe, expect, it, vi } from "vitest";
import { createComputerUseRuntime } from "./createComputerUseRuntime";
import * as computerUse from "./index";

describe("createComputerUseRuntime", () => {
  it("returns all expected surfaces", () => {
    const runtime = createComputerUseRuntime();

    expect(runtime.pipeline).toBeDefined();
    expect(runtime.missionEngineBridge).toBeDefined();
    expect(runtime.missionStepAdapter).toBeDefined();
    expect(runtime.runtimeEntrypoint).toBeDefined();
    expect(runtime.missionRunner).toBeDefined();
    expect(runtime.missionTapeAdapter).toBeDefined();
    expect(runtime.runComputerUseStep).toBeTypeOf("function");
    expect(runtime.runPipelineInput).toBeTypeOf("function");
    expect(runtime.runMissionSteps).toBeTypeOf("function");
    expect(runtime.reset).toBeTypeOf("function");
  });

  it("runPipelineInput delegates through runtime entrypoint", async () => {
    const runtime = createComputerUseRuntime();
    const spy = vi.spyOn(runtime.runtimeEntrypoint, "runPipelineInput");

    await runtime.runPipelineInput({ missionId: "m-1" });

    expect(spy).toHaveBeenCalledWith({ pipelineInput: { missionId: "m-1" } });
  });

  it("runComputerUseStep delegates through mission step adapter", async () => {
    const runtime = createComputerUseRuntime();
    const spy = vi.spyOn(runtime.missionStepAdapter, "executeStep");
    const step = { missionId: "m-1", stepId: "s-1", kind: "computer_use" };

    await runtime.runComputerUseStep(step);

    expect(spy).toHaveBeenCalledWith(step);
  });

  it("runMissionSteps delegates through mission runner", async () => {
    const runtime = createComputerUseRuntime();
    const spy = vi.spyOn(runtime.missionRunner, "runSteps");
    const steps = [{ missionId: "m-1", stepId: "s-1", kind: "computer_use" }];

    await runtime.runMissionSteps(steps);

    expect(spy).toHaveBeenCalledWith(steps);
  });

  it("reset resets composed surfaces safely", () => {
    const runtime = createComputerUseRuntime();
    const runnerReset = vi.spyOn(runtime.missionRunner, "reset");
    const tapeReset = vi.spyOn(runtime.missionTapeAdapter, "reset");

    runtime.reset();

    expect(runnerReset).toHaveBeenCalledTimes(1);
    expect(tapeReset).toHaveBeenCalledTimes(1);
  });

  it("barrel exports include runtime factory and key runtime classes", () => {
    expect(computerUse.createComputerUseRuntime).toBeDefined();
    expect(computerUse.ComputerUseRuntimeEntrypoint).toBeDefined();
    expect(computerUse.ComputerUseMissionRunner).toBeDefined();
    expect(computerUse.ComputerUseMissionStepAdapter).toBeDefined();
    expect(computerUse.ComputerUseMissionEngineBridge).toBeDefined();
  });
});
