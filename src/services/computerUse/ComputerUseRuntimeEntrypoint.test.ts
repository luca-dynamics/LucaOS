import { describe, expect, it, vi } from "vitest";
import { ComputerUseRuntimeEntrypoint } from "./ComputerUseRuntimeEntrypoint";

describe("ComputerUseRuntimeEntrypoint", () => {
  it("runs mission step input through adapter", async () => {
    const executeStep = vi.fn().mockResolvedValue({ status: "completed" });
    const entrypoint = new ComputerUseRuntimeEntrypoint({ missionStepAdapter: { executeStep, reset: vi.fn() }, pipeline: { run: vi.fn(), reset: vi.fn() } });

    await entrypoint.runComputerUseStep({ missionId: "m1", stepId: "s1", kind: "computer_use" });
    expect(executeStep).toHaveBeenCalled();
  });

  it("runs raw pipeline input through pipeline", async () => {
    const run = vi.fn().mockResolvedValue({ missionId: "m1" });
    const entrypoint = new ComputerUseRuntimeEntrypoint({ missionStepAdapter: { executeStep: vi.fn(), reset: vi.fn() }, pipeline: { run, reset: vi.fn() } });

    await entrypoint.runPipelineInput({ pipelineInput: { missionId: "m1" } });
    expect(run).toHaveBeenCalled();
  });

  it("invalid input fails safely", async () => {
    const entrypoint = new ComputerUseRuntimeEntrypoint({ missionStepAdapter: { executeStep: vi.fn(), reset: vi.fn() }, pipeline: { run: vi.fn(), reset: vi.fn() } });
    const result = await entrypoint.runPipelineInput({});
    expect(result.ok).toBe(false);
  });

  it('mission step with kind "not_computer" fails safely and does not call missionStepAdapter.executeStep', async () => {
    const executeStep = vi.fn();
    const entrypoint = new ComputerUseRuntimeEntrypoint({ missionStepAdapter: { executeStep, reset: vi.fn() }, pipeline: { run: vi.fn(), reset: vi.fn() } });

    const result = await entrypoint.runComputerUseStep({ missionId: "m1", stepId: "s1", kind: "not_computer" });

    expect(result.ok).toBe(false);
    expect(executeStep).not.toHaveBeenCalled();
  });

  it("metadata systemApisCalled false", async () => {
    const entrypoint = new ComputerUseRuntimeEntrypoint({
      missionStepAdapter: { executeStep: vi.fn().mockResolvedValue({ status: "completed" }), reset: vi.fn() },
      pipeline: { run: vi.fn(), reset: vi.fn() },
    });

    const result = await entrypoint.runComputerUseStep({ missionId: "m1", stepId: "s1", kind: "computer_use" });
    expect(result.metadata.systemApisCalled).toBe(false);
  });
});
