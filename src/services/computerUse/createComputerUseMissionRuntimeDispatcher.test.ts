import { describe, expect, it } from "vitest";
import * as computerUse from "./index";
import { createComputerUseMissionRuntimeDispatcher } from "./createComputerUseMissionRuntimeDispatcher";

describe("createComputerUseMissionRuntimeDispatcher", () => {
  it("returns composed runtime, registry, dispatcher surface", () => {
    const x = createComputerUseMissionRuntimeDispatcher();
    expect(x.runtime).toBeDefined();
    expect(x.registry).toBeDefined();
    expect(x.dispatcher).toBeDefined();
    expect(typeof x.dispatchStep).toBe("function");
    expect(typeof x.canHandle).toBe("function");
    expect(typeof x.reset).toBe("function");
  });

  it("barrel exports include registry/dispatcher/factory", () => {
    expect(computerUse.ComputerUseMissionRuntimeRegistry).toBeDefined();
    expect(computerUse.ComputerUseMissionRuntimeDispatcher).toBeDefined();
    expect(computerUse.createComputerUseMissionRuntimeDispatcher).toBeDefined();
  });
});
