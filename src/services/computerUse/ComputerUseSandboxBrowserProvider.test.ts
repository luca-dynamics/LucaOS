import { describe, expect, it } from "vitest";
import { ComputerUseSandboxBrowserProvider } from "./ComputerUseSandboxBrowserProvider";

describe("ComputerUseSandboxBrowserProvider", () => {
  const provider = new ComputerUseSandboxBrowserProvider();

  it("handles sandbox_browser only", () => {
    expect(provider.canHandle({ lane: "sandbox_browser" })).toBe(true);
  });

  it("rejects direct_host_browser", () => {
    expect(provider.canHandle({ lane: "direct_host_browser" })).toBe(false);
  });

  it("executeRoute simulates success", async () => {
    const result = await provider.executeRoute({
      lane: "sandbox_browser",
      action: { type: "click", reason: "click", requiresGuardApproval: false },
      metadata: { bridgeKind: "scaffold", browserRuntimeImported: false },
    });
    expect(result.status).toBe("executed");
  });

  it("exact type_text payload preserved", async () => {
    const result = await provider.executeRoute({
      lane: "sandbox_browser",
      action: { type: "type_text", reason: "type", requiresGuardApproval: false, text: "  keep exact  " },
      metadata: { bridgeKind: "scaffold", browserRuntimeImported: false },
    });
    expect(result.action.text).toBe("  keep exact  ");
  });

  it("metadata browserApisCalled false", async () => {
    const result = await provider.executeRoute({
      lane: "sandbox_browser",
      action: { type: "wait", reason: "wait", requiresGuardApproval: false },
      metadata: { bridgeKind: "scaffold", browserRuntimeImported: false },
    });
    expect(result.metadata.browserApisCalled).toBe(false);
  });
});
