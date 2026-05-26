import { describe, expect, it } from "vitest";
import { ComputerUseSandboxBrowserProvider } from "./ComputerUseSandboxBrowserProvider";

describe("ComputerUseSandboxBrowserProvider", () => {
  it("handles sandbox_browser only", () => {
    const provider = new ComputerUseSandboxBrowserProvider();
    expect(provider.canHandle({ lane: "sandbox_browser", executionMode: "sandbox", action: { type: "click", reason: "x", requiresGuardApproval: false }, metadata: { bridgeKind: "scaffold", browserRuntimeImported: false } })).toBe(true);
  });

  it("rejects direct_host_browser", () => {
    const provider = new ComputerUseSandboxBrowserProvider();
    expect(provider.canHandle({ lane: "direct_host_browser", executionMode: "direct_host", action: { type: "click", reason: "x", requiresGuardApproval: false }, metadata: { bridgeKind: "scaffold", browserRuntimeImported: false } })).toBe(false);
  });

  it("executeRoute simulates success", async () => {
    const provider = new ComputerUseSandboxBrowserProvider();
    const result = await provider.executeRoute({ lane: "sandbox_browser", executionMode: "sandbox", action: { type: "wait", reason: "pause", requiresGuardApproval: false }, metadata: { bridgeKind: "scaffold", browserRuntimeImported: false } });
    expect(result.status).toBe("executed");
  });

  it("exact type_text payload preserved", async () => {
    const provider = new ComputerUseSandboxBrowserProvider();
    const result = await provider.executeRoute({ lane: "sandbox_browser", executionMode: "sandbox", action: { type: "type_text", reason: "type", requiresGuardApproval: false, text: "  exact  " }, metadata: { bridgeKind: "scaffold", browserRuntimeImported: false } });
    expect(result.request.action.text).toBe("  exact  ");
  });

  it("metadata browserApisCalled false", async () => {
    const provider = new ComputerUseSandboxBrowserProvider();
    const result = await provider.executeRoute({ lane: "sandbox_browser", executionMode: "sandbox", action: { type: "scroll", reason: "scroll", requiresGuardApproval: false }, metadata: { bridgeKind: "scaffold", browserRuntimeImported: false } });
    expect(result.metadata.browserApisCalled).toBe(false);
  });
});
