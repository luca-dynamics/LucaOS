import { describe, expect, it } from "vitest";
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
