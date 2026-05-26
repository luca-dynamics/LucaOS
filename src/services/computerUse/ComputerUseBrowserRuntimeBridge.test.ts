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

  it("direct_host maps to authenticated_direct_host", () => {
    expect(bridge.selectLaneFromExecutionMode("direct_host")).toBe("authenticated_direct_host");
  });

  it("observe does not require browser runtime", () => {
    expect(bridge.requiresBrowserRuntime({ type: "observe", reason: "scan", requiresGuardApproval: false })).toBe(false);
  });

  it("click target with only role button does not require browser runtime", () => {
    expect(
      bridge.requiresBrowserRuntime({
        type: "click",
        reason: "click primary CTA",
        requiresGuardApproval: false,
        target: { role: "button" },
      }),
    ).toBe(false);
  });

  it("click target with only label Save does not require browser runtime", () => {
    expect(
      bridge.requiresBrowserRuntime({
        type: "click",
        reason: "save file",
        requiresGuardApproval: false,
        target: { label: "Save" },
      }),
    ).toBe(false);
  });

  it("click target with description browser tab requires browser runtime", () => {
    expect(
      bridge.requiresBrowserRuntime({
        type: "click",
        reason: "switch target",
        requiresGuardApproval: false,
        target: { description: "browser tab" },
      }),
    ).toBe(true);
  });

  it("type_text target with selectorHint requires browser runtime", () => {
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

  it("scroll/wait/hotkey with browser-specific context requires browser runtime", () => {
    expect(bridge.requiresBrowserRuntime({ type: "scroll", reason: "scroll web page", requiresGuardApproval: false })).toBe(true);
    expect(bridge.requiresBrowserRuntime({ type: "wait", reason: "wait for browser tab", requiresGuardApproval: false })).toBe(true);
    expect(bridge.requiresBrowserRuntime({ type: "hotkey", reason: "open page search", requiresGuardApproval: false })).toBe(true);
  });

  it("scroll/wait/hotkey with no browser-specific context does not require browser runtime", () => {
    expect(bridge.requiresBrowserRuntime({ type: "scroll", reason: "scroll list", requiresGuardApproval: false })).toBe(false);
    expect(bridge.requiresBrowserRuntime({ type: "wait", reason: "wait briefly", requiresGuardApproval: false })).toBe(false);
    expect(bridge.requiresBrowserRuntime({ type: "hotkey", reason: "shortcut", requiresGuardApproval: false })).toBe(false);
  });

  it("scroll/wait/hotkey can require browser runtime with explicit default browser context option", () => {
    const browserContextBridge = new ComputerUseBrowserRuntimeBridge({ defaultBrowserContext: true });
    expect(browserContextBridge.requiresBrowserRuntime({ type: "scroll", reason: "scroll", requiresGuardApproval: false })).toBe(true);
    expect(browserContextBridge.requiresBrowserRuntime({ type: "wait", reason: "wait", requiresGuardApproval: false })).toBe(true);
    expect(browserContextBridge.requiresBrowserRuntime({ type: "hotkey", reason: "press", requiresGuardApproval: false })).toBe(true);
  });

  it("metadata browserRuntimeImported false", () => {
    const req = bridge.toBrowserRouteRequest({ type: "wait", reason: "wait", requiresGuardApproval: false }, "sandbox");
    expect(req.metadata.browserRuntimeImported).toBe(false);
  });
});
