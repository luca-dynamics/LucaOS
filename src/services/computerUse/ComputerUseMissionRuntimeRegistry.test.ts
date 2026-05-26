import { describe, expect, it, vi } from "vitest";
import { ComputerUseMissionRuntimeRegistry } from "./ComputerUseMissionRuntimeRegistry";

describe("ComputerUseMissionRuntimeRegistry", () => {
  it("default registry handles computer_use", () => {
    const runtime = { runComputerUseStep: vi.fn() } as any;
    const registry = new ComputerUseMissionRuntimeRegistry({ runtime });
    expect(registry.canHandle({ kind: "computer_use" })).toBe(true);
    expect(registry.listHandlers()).toContain("computer_use");
  });

  it("prevents duplicate handler overwrite by default", () => {
    const runtime = { runComputerUseStep: vi.fn() } as any;
    const registry = new ComputerUseMissionRuntimeRegistry({ runtime });
    const h = vi.fn();
    registry.registerHandler("custom", h);
    expect(() => registry.registerHandler("custom", vi.fn())).toThrow(/already registered/);
  });

  it("allows duplicate overwrite only with explicit option", () => {
    const runtime = { runComputerUseStep: vi.fn() } as any;
    const registry = new ComputerUseMissionRuntimeRegistry({ runtime });
    const h1 = vi.fn();
    const h2 = vi.fn();
    registry.registerHandler("custom", h1);
    registry.registerHandler("custom", h2, { overwrite: true });
    expect(registry.getHandler("custom")).toBe(h2);
  });

  it("reset keeps scaffold-safe metadata", () => {
    const runtime = { runComputerUseStep: vi.fn() } as any;
    const registry = new ComputerUseMissionRuntimeRegistry({ runtime });
    registry.registerHandler("custom", vi.fn());
    registry.reset();
    const snapshot = registry.getSnapshot();
    expect(snapshot.handlers).toEqual(["computer_use"]);
    expect(snapshot.metadata.systemApisCalled).toBe(false);
    expect(snapshot.metadata.missionEngineImported).toBe(false);
  });
});
