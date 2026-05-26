import { describe, expect, it } from "vitest";
import * as barrel from "./index";
import { createComputerUseBrowserRuntimeAdapter } from "./createComputerUseBrowserRuntimeAdapter";

describe("createComputerUseBrowserRuntimeAdapter", () => {
  it("factory exposes adapter surface", async () => {
    const created = createComputerUseBrowserRuntimeAdapter({ featureFlags: { browserRuntimeEnabled: true } });
    expect(created.adapter).toBeDefined();
    expect(typeof created.execute).toBe("function");
    expect(typeof created.canHandle).toBe("function");
    expect(typeof created.getSnapshot).toBe("function");
    expect(typeof created.reset).toBe("function");
    const result = await created.execute({
      lane: "sandbox_browser",
      action: { type: "wait", reason: "wait", requiresGuardApproval: false },
    });
    expect(result.metadata.simulated).toBe(true);
  });

  it("barrel exports include adapter and factory", () => {
    expect(barrel.ComputerUseBrowserRuntimeAdapter).toBeDefined();
    expect(barrel.createComputerUseBrowserRuntimeAdapter).toBeDefined();
  });
});
