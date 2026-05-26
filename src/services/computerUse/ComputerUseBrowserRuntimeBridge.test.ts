import { describe, expect, it } from "vitest";
import { ComputerUseBrowserRuntimeBridge } from "./ComputerUseBrowserRuntimeBridge";

describe("ComputerUseBrowserRuntimeBridge", () => {
  it("sandbox maps to sandbox_browser", () => {
    const bridge = new ComputerUseBrowserRuntimeBridge();
    expect(bridge.selectLaneFromExecutionMode("sandbox")).toBe("sandbox_browser");
  });

  it("browser_body maps to ghost_browser", () => {
    const bridge = new ComputerUseBrowserRuntimeBridge();
    expect(bridge.selectLaneFromExecutionMode("browser_body")).toBe("ghost_browser");
  });

  it("observe does not require browser runtime", () => {
    const bridge = new ComputerUseBrowserRuntimeBridge();
    expect(bridge.requiresBrowserRuntime({ type: "observe", reason: "scan", requiresGuardApproval: false })).toBe(false);
  });

  it("browser-like click/type_text requires browser runtime", () => {
    const bridge = new ComputerUseBrowserRuntimeBridge();
    expect(
      bridge.requiresBrowserRuntime({
        type: "click",
        reason: "Click browser tab",
        requiresGuardApproval: false,
        target: { description: "Browser tab" },
      }),
    ).toBe(true);
    expect(
      bridge.requiresBrowserRuntime({
        type: "type_text",
        reason: "Type in form input",
        requiresGuardApproval: false,
        text: "hello",
        target: { label: "Web form" },
      }),
    ).toBe(true);
  });

  it("metadata browserRuntimeImported false", () => {
    const bridge = new ComputerUseBrowserRuntimeBridge();
    const request = bridge.toBrowserRouteRequest({ type: "click", reason: "go", requiresGuardApproval: false }, "sandbox");
    expect(request.metadata.browserRuntimeImported).toBe(false);
  });
});
