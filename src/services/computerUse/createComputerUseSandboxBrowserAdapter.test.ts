import { describe, expect, it, vi } from "vitest";
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
    const hotkey = await created.execute({ lane: "sandbox_browser", action: { type: "hotkey", reason: "hotkey", requiresGuardApproval: false } });
    expect(hotkey.status).toBe("failed");
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
    expect(barrel.getComputerUseBrowserRuntimeConformanceMatrix).toBeDefined();
  });
});


it("can inject external sink adapter with explicit opt-in", async () => {
  const external = { record: vi.fn().mockResolvedValue({ ok: true }) };
  const created = createComputerUseSandboxBrowserAdapter({ featureFlags: { sandboxBrowserAdapterEnabled: true }, externalMissionTapeSink: external, enableExternalMissionTapeSink: true });
  await created.execute({ lane: "sandbox_browser", action: { type: "wait", reason: "wait", requiresGuardApproval: false }, context: { missionId: "m-sb" } });
  expect(external.record).toHaveBeenCalled();
});
