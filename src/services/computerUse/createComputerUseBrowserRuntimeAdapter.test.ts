import { describe, expect, it } from "vitest";
import * as barrel from "./index";
import { createComputerUseBrowserRuntimeAdapter } from "./createComputerUseBrowserRuntimeAdapter";

describe("createComputerUseBrowserRuntimeAdapter", () => {
  it("factory exposes adapter + recording surface", async () => {
    const created = createComputerUseBrowserRuntimeAdapter({ featureFlags: { browserRuntimeEnabled: true } });
    expect(created.adapter).toBeDefined();
    expect(created.tapeSink).toBeDefined();
    expect(created.eventBridge).toBeDefined();
    expect(typeof created.getTapeSnapshot).toBe("function");
    const result = await created.execute({ lane: "sandbox_browser", action: { type: "wait", reason: "wait", requiresGuardApproval: false } });
    expect(result.metadata.simulated).toBe(true);
    expect(created.getTapeSnapshot()?.records.length).toBeGreaterThan(0);
  });

  it("reset clears adapter snapshot and tape records", async () => {
    const created = createComputerUseBrowserRuntimeAdapter({ featureFlags: { browserRuntimeEnabled: true } });
    await created.execute({ lane: "sandbox_browser", action: { type: "wait", reason: "wait", requiresGuardApproval: false } });
    expect(created.getSnapshot().executionCount).toBe(1);
    expect(created.getTapeSnapshot()?.records.length).toBeGreaterThan(0);
    created.reset();
    expect(created.getSnapshot().executionCount).toBe(0);
    expect(created.getTapeSnapshot()?.records).toEqual([]);
  });

  it("supports disabling recording infra", () => {
    const created = createComputerUseBrowserRuntimeAdapter({ recordingEnabled: false });
    expect(created.tapeSink).toBeUndefined();
    expect(created.eventBridge).toBeUndefined();
    expect(created.getTapeSnapshot()).toBeUndefined();
  });

  it("barrel exports include adapter and factory", () => {
    expect(barrel.ComputerUseBrowserRuntimeAdapter).toBeDefined();
    expect(barrel.createComputerUseBrowserRuntimeAdapter).toBeDefined();
  });
});
