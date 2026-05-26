import { describe, expect, it, vi } from "vitest";
import { ComputerUseMissionRuntimeDispatcher } from "./ComputerUseMissionRuntimeDispatcher";
import { ComputerUseMissionRuntimeRegistry } from "./ComputerUseMissionRuntimeRegistry";

describe("ComputerUseMissionRuntimeDispatcher", () => {
  it("unsupported step kinds are rejected safely", async () => {
    const runtime = { runComputerUseStep: vi.fn() } as any;
    const registry = new ComputerUseMissionRuntimeRegistry({ runtime });
    const dispatcher = new ComputerUseMissionRuntimeDispatcher({ registry });
    const res = await dispatcher.dispatch({ step: { missionId: "m1", stepId: "s1", kind: "unknown" } });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/Unsupported mission step kind/);
    expect(res.metadata.systemApisCalled).toBe(false);
  });

  it("routes computer_use to composed runtime", async () => {
    const runComputerUseStep = vi.fn().mockResolvedValue({ status: "completed", reason: "ok" });
    const runtime = { runComputerUseStep } as any;
    const registry = new ComputerUseMissionRuntimeRegistry({ runtime });
    const dispatcher = new ComputerUseMissionRuntimeDispatcher({ registry });
    const step = { missionId: "m1", stepId: "s1", kind: "computer_use" };

    const res = await dispatcher.dispatch({ step });

    expect(runComputerUseStep).toHaveBeenCalledWith(step);
    expect(res.ok).toBe(true);
    expect(res.metadata.systemApisCalled).toBe(false);
  });
});
