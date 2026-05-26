import { describe, expect, it } from "vitest";
import * as barrel from "./index";
import { createComputerUseSandboxBrowserAdapter } from "./createComputerUseSandboxBrowserAdapter";

describe("createComputerUseSandboxBrowserAdapter", () => {
  it("factory exposes adapter surface", async () => {
    const created = createComputerUseSandboxBrowserAdapter({ featureFlags: { sandboxBrowserAdapterEnabled: true } });
    expect(created.adapter).toBeDefined();
    expect(typeof created.execute).toBe("function");
    expect(typeof created.canHandle).toBe("function");
    const result = await created.execute({ lane: "sandbox_browser", action: { type: "wait", reason: "wait", requiresGuardApproval: false } });
    expect(result.status).toBe("executed");
    expect(created.getTapeSnapshot()?.records.length).toBeGreaterThan(0);
  });

  it("reset clears snapshot", async () => {
    const created = createComputerUseSandboxBrowserAdapter({ featureFlags: { sandboxBrowserAdapterEnabled: true } });
    await created.execute({ lane: "sandbox_browser", action: { type: "observe", reason: "observe", requiresGuardApproval: false } });
    expect(created.getSnapshot().executionCount).toBe(1);
    created.reset();
    expect(created.getSnapshot().executionCount).toBe(0);
  });

  it("barrel exports include sandbox adapter and factory", () => {
    expect(barrel.ComputerUseSandboxBrowserAdapter).toBeDefined();
    expect(barrel.createComputerUseSandboxBrowserAdapter).toBeDefined();
  });
});
