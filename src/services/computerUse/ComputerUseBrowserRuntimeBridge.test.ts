import { describe, expect, it } from "vitest";
import { ComputerUseBrowserRuntimeBridge } from "./ComputerUseBrowserRuntimeBridge";

describe("ComputerUseBrowserRuntimeBridge", () => {
  const bridge = new ComputerUseBrowserRuntimeBridge();

  it("sandbox maps to sandbox_browser", () => {
    expect(bridge.selectLaneFromExecutionMode("sandbox")).toBe("sandbox_browser");
  });

  it("browser_body maps to ghost_browser", () => {
    expect(bridge.selectLaneFromExecutionMode("browser_body")).toBe("ghost_browser");
  });

  it("observe does not require browser runtime", () => {
    expect(bridge.requiresBrowserRuntime({ type: "observe", reason: "scan", requiresGuardApproval: false })).toBe(false);
  });

  it("browser-like click/type_text requires browser runtime", () => {
    expect(
      bridge.requiresBrowserRuntime({
        type: "click",
        reason: "click browser tab",
        requiresGuardApproval: false,
        target: { role: "button", label: "Tab", description: "browser tab" },
      }),
    ).toBe(true);
    expect(
      bridge.requiresBrowserRuntime({
        type: "type_text",
        reason: "type",
        requiresGuardApproval: false,
        text: "hello",
        target: { selectorHint: "#browser-input" },
      }),
    ).toBe(true);
  });

  it("metadata browserRuntimeImported false", () => {
    const req = bridge.toBrowserRouteRequest({ type: "wait", reason: "wait", requiresGuardApproval: false }, "sandbox");
    expect(req.metadata.browserRuntimeImported).toBe(false);
  });
});
