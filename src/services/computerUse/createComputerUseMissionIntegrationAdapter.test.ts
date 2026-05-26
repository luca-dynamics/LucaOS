import { describe, expect, it, vi } from "vitest";
import * as computerUse from "./index";
import { createComputerUseMissionIntegrationAdapter } from "./createComputerUseMissionIntegrationAdapter";

describe("createComputerUseMissionIntegrationAdapter", () => {
  it("returns composed mission runtime + adapter surface", () => {
    const x = createComputerUseMissionIntegrationAdapter();
    expect(x.missionRuntime).toBeDefined();
    expect(x.adapter).toBeDefined();
    expect(typeof x.dispatch).toBe("function");
    expect(typeof x.canHandle).toBe("function");
    expect(x.tapeSink).toBeDefined();
    expect(x.eventBridge).toBeDefined();
    expect(typeof x.getTapeSnapshot).toBe("function");
    expect(typeof x.reset).toBe("function");
  });

  it("reset() resets composed surfaces", async () => {
    const x = createComputerUseMissionIntegrationAdapter();
    await x.dispatch({
      step: { missionId: "m1", stepId: "s1", kind: "computer_use" },
      featureFlags: { computerUseEnabled: true },
    });

    x.reset();
    expect(x.adapter.getSnapshot().lastInput).toBeUndefined();
    expect(x.getTapeSnapshot().records).toEqual([]);
  });

  it("barrel exports include mission integration adapter + factory", () => {
    expect(computerUse.ComputerUseMissionIntegrationAdapter).toBeDefined();
    expect(computerUse.createComputerUseMissionIntegrationAdapter).toBeDefined();
    expect(computerUse.ComputerUseInMemoryMissionTapeSink).toBeDefined();
    expect(computerUse.ComputerUseRuntimeEventBridge).toBeDefined();
  });
});


it("uses external sink only when explicitly enabled", async () => {
  const external = { record: vi.fn().mockResolvedValue({ ok: true }) };
  const x = createComputerUseMissionIntegrationAdapter({ externalMissionTapeSink: external });
  await x.dispatch({ step: { missionId: "m1", stepId: "s1", kind: "computer_use" }, featureFlags: { computerUseEnabled: true } });
  expect(external.record).not.toHaveBeenCalled();
  const y = createComputerUseMissionIntegrationAdapter({ externalMissionTapeSink: external, enableExternalMissionTapeSink: true });
  await y.dispatch({ step: { missionId: "m2", stepId: "s2", kind: "computer_use" }, featureFlags: { computerUseEnabled: true } });
  expect(external.record).toHaveBeenCalled();
});
