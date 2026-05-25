import { describe, expect, it } from "vitest";
import { ComputerUseFocusContextBuilder } from "./ComputerUseFocusContext";

describe("ComputerUseFocusContextBuilder", () => {
  it("creates base context with sandbox default", () => {
    const builder = new ComputerUseFocusContextBuilder();
    const result = builder.build();

    expect(result.executionMode).toBe("sandbox");
    expect(result.metadata.contextOnly).toBe(true);
    expect(result.metadata.actionsEnabled).toBe(false);
    expect(result.metadata.systemApisEnabled).toBe(false);
  });

  it("attaches cursor point", () => {
    const result = new ComputerUseFocusContextBuilder()
      .withCursorPoint({ x: 10, y: 20, timestamp: "2026-01-01T00:00:00.000Z" })
      .build();

    expect(result.cursorPoint?.x).toBe(10);
    expect(result.focusSignals.some((signal) => signal.kind === "cursor_point")).toBe(true);
  });

  it("attaches screen region", () => {
    const result = new ComputerUseFocusContextBuilder()
      .withScreenRegion({ x: 1, y: 2, width: 300, height: 150, label: "cta" })
      .build();

    expect(result.screenRegion?.label).toBe("cta");
    expect(result.focusSignals.some((signal) => signal.kind === "screen_region")).toBe(true);
  });

  it("attaches focused element", () => {
    const result = new ComputerUseFocusContextBuilder()
      .withFocusedElement({ role: "button", label: "Submit" })
      .build();

    expect(result.focusedElement?.label).toBe("Submit");
    expect(result.focusSignals.some((signal) => signal.kind === "focused_element")).toBe(true);
  });

  it("attaches screenshot reference", () => {
    const result = new ComputerUseFocusContextBuilder()
      .withScreenshotReference({ id: "ss-1", capturedAt: "2026-01-01T00:00:00.000Z" })
      .build();

    expect(result.screenshotReference?.id).toBe("ss-1");
    expect(result.focusSignals.some((signal) => signal.kind === "screenshot_reference")).toBe(true);
  });

  it("attaches user-pointed target", () => {
    const result = new ComputerUseFocusContextBuilder()
      .withUserPointedTarget({ description: "Use this input" })
      .build();

    const pointedSignal = result.focusSignals.find((signal) => signal.kind === "user_pointed_target");
    expect(result.userPointedTarget?.description).toBe("Use this input");
    expect(pointedSignal?.highValueGrounding).toBe(true);
  });

  it("untrusted context prefers sandbox", () => {
    const builder = new ComputerUseFocusContextBuilder({
      executionMode: "direct_host",
      trustTier: "untrusted",
    });

    const result = builder.build();

    expect(result.prefersSandbox).toBe(true);
    expect(result.executionMode).toBe("sandbox");
  });

  it("dangerous context records approval requirement metadata", () => {
    const result = new ComputerUseFocusContextBuilder({ riskLevel: "dangerous" }).build();

    expect(result.requiresGuardApproval).toBe(true);
  });

  it("reset clears prior signals", () => {
    const builder = new ComputerUseFocusContextBuilder();

    const result = builder
      .withCursorPoint({ x: 1, y: 1, timestamp: "2026-01-01T00:00:00.000Z" })
      .withUserPointedTarget({ description: "target" })
      .reset()
      .build();

    expect(result.cursorPoint).toBeUndefined();
    expect(result.userPointedTarget).toBeUndefined();
    expect(result.focusSignals).toHaveLength(0);
  });
});
