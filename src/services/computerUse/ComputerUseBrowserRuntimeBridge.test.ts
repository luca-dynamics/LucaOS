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

  it("click target with only role button does NOT require browser runtime", () => {
    expect(
      bridge.requiresBrowserRuntime({
        type: "click",
        reason: "click primary CTA",
        requiresGuardApproval: false,
        target: { role: "button" },
      }),
    ).toBe(false);
  });

  it("click target with only label Save does NOT require browser runtime", () => {
    expect(
      bridge.requiresBrowserRuntime({
        type: "click",
        reason: "save file",
        requiresGuardApproval: false,
        target: { label: "Save" },
      }),
    ).toBe(false);
  });

  it("click target with description browser tab DOES require browser runtime", () => {
    expect(
      bridge.requiresBrowserRuntime({
        type: "click",
        reason: "switch target",
        requiresGuardApproval: false,
        target: { description: "browser tab" },
      }),
    ).toBe(true);
  });

  it("type_text target with selectorHint #email DOES require browser runtime", () => {
    expect(
      bridge.requiresBrowserRuntime({
        type: "type_text",
        reason: "type",
        requiresGuardApproval: false,
        text: "hello",
        target: { selectorHint: "#email" },
      }),
    ).toBe(true);
  });

  it("metadata browserRuntimeImported false", () => {
    const req = bridge.toBrowserRouteRequest({ type: "wait", reason: "wait", requiresGuardApproval: false }, "sandbox");
    expect(req.metadata.browserRuntimeImported).toBe(false);
  });
});
