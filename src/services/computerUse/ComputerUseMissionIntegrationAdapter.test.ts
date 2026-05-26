import { describe, expect, it, vi } from "vitest";
import { ComputerUseMissionIntegrationAdapter } from "./ComputerUseMissionIntegrationAdapter";

describe("ComputerUseMissionIntegrationAdapter", () => {
  it("rejects missing or malformed steps safely", async () => {
    const dispatcher = { dispatch: vi.fn(), reset: vi.fn() };
    const adapter = new ComputerUseMissionIntegrationAdapter({ dispatcher });

    const res = await adapter.dispatch({ step: null });

    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/Missing or malformed/);
    expect(res.metadata.systemApisCalled).toBe(false);
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it("rejects unsupported kinds safely", async () => {
    const dispatcher = { dispatch: vi.fn(), reset: vi.fn() };
    const adapter = new ComputerUseMissionIntegrationAdapter({ dispatcher });

    const res = await adapter.dispatch({ step: { missionId: "m1", stepId: "s1", kind: "tool_call" } });

    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/Unsupported mission step kind/);
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it("rejects computer_use without explicit opt-in", async () => {
    const dispatcher = { dispatch: vi.fn(), reset: vi.fn() };
    const adapter = new ComputerUseMissionIntegrationAdapter({ dispatcher });

    const res = await adapter.dispatch({ step: { missionId: "m1", stepId: "s1", kind: "computer_use" } });

    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/explicit opt-in/);
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it("accepts and delegates computer_use with explicit opt-in", async () => {
    const dispatcher = {
      dispatch: vi.fn().mockResolvedValue({ ok: true, step: { missionId: "m1", stepId: "s1", kind: "computer_use" }, stepResult: { status: "completed", reason: "ok" } }),
      reset: vi.fn(),
    };
    const adapter = new ComputerUseMissionIntegrationAdapter({ dispatcher });

    const input = {
      step: { missionId: "m1", stepId: "s1", kind: "computer_use" },
      featureFlags: { computerUseEnabled: true },
    };
    const res = await adapter.dispatch(input);

    expect(res.ok).toBe(true);
    expect(dispatcher.dispatch).toHaveBeenCalledWith({ step: input.step });
  });

  it("canHandle requires computer_use and opt-in", () => {
    const dispatcher = { dispatch: vi.fn(), reset: vi.fn() };
    const adapter = new ComputerUseMissionIntegrationAdapter({ dispatcher });

    expect(adapter.canHandle({ step: { missionId: "m1", stepId: "s1", kind: "computer_use" } })).toBe(false);
    expect(
      adapter.canHandle({ step: { missionId: "m1", stepId: "s1", kind: "computer_use" }, featureFlags: { enableComputerUseDispatch: true } }),
    ).toBe(true);
    expect(
      adapter.canHandle({ step: { missionId: "m1", stepId: "s1", kind: "workflow" }, featureFlags: { enableComputerUseDispatch: true } }),
    ).toBe(false);
  });

  it("reset clears snapshot and resets dispatcher", async () => {
    const dispatcher = { dispatch: vi.fn(), reset: vi.fn() };
    const adapter = new ComputerUseMissionIntegrationAdapter({ dispatcher });

    await adapter.dispatch({ step: { missionId: "m1", stepId: "s1", kind: "computer_use" }, featureFlags: { computerUseEnabled: true } });
    adapter.reset();

    expect(adapter.getSnapshot().lastInput).toBeUndefined();
    expect(dispatcher.reset).toHaveBeenCalled();
  });
});
