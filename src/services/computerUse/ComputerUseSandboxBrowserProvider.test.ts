import { describe, expect, it } from "vitest";
import { ComputerUseSandboxBrowserProvider } from "./ComputerUseSandboxBrowserProvider";

describe("ComputerUseSandboxBrowserProvider", () => {
  it("handles sandbox_browser only", () => {
    const provider = new ComputerUseSandboxBrowserProvider();
    expect(provider.canHandle({ lane: "sandbox_browser" })).toBe(true);
  });

  it("rejects authenticated_direct_host", () => {
    const provider = new ComputerUseSandboxBrowserProvider();
    expect(provider.canHandle({ lane: "authenticated_direct_host" })).toBe(false);
  });

  it("executeRoute simulates success", async () => {
    const provider = new ComputerUseSandboxBrowserProvider();
    const result = await provider.executeRoute({
      lane: "sandbox_browser",
      action: { type: "click", reason: "click", requiresGuardApproval: false },
      metadata: { bridgeKind: "scaffold", browserRuntimeImported: false },
    });
    expect(result.status).toBe("executed");
  });

  it("exact type_text payload preserved", async () => {
    const provider = new ComputerUseSandboxBrowserProvider();
    const result = await provider.executeRoute({
      lane: "sandbox_browser",
      action: { type: "type_text", reason: "type", requiresGuardApproval: false, text: "  keep exact  " },
      metadata: { bridgeKind: "scaffold", browserRuntimeImported: false },
    });
    expect(result.action.text).toBe("  keep exact  ");
  });

  it("metadata browserApisCalled false", async () => {
    const provider = new ComputerUseSandboxBrowserProvider();
    const result = await provider.executeRoute({
      lane: "sandbox_browser",
      action: { type: "wait", reason: "wait", requiresGuardApproval: false },
      metadata: { bridgeKind: "scaffold", browserRuntimeImported: false },
    });
    expect(result.metadata.browserApisCalled).toBe(false);
  });

  it("executeRoute then listRoutes returns one recorded route/result", async () => {
    const provider = new ComputerUseSandboxBrowserProvider();
    const route = {
      lane: "sandbox_browser" as const,
      action: { type: "click" as const, reason: "click", requiresGuardApproval: false },
      metadata: { bridgeKind: "scaffold" as const, browserRuntimeImported: false as const },
    };
    const result = await provider.executeRoute(route);
    const records = provider.listRoutes();
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({ route, result });
  });

  it("reset clears recorded routes", async () => {
    const provider = new ComputerUseSandboxBrowserProvider();
    await provider.executeRoute({
      lane: "sandbox_browser",
      action: { type: "wait", reason: "wait", requiresGuardApproval: false },
      metadata: { bridgeKind: "scaffold", browserRuntimeImported: false },
    });
    provider.reset();
    expect(provider.listRoutes()).toEqual([]);
  });
});
