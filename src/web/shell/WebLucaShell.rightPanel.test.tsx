// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, expect, it } from "vitest";
import { WebLucaShell } from "../WebLucaShell";

function mount(ui: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return {
    container,
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const props = {
  hostClass: "browser",
  lucaLinkStatus: "connector-required",
  browserCapabilities: [],
  guardedNativeCapabilities: [],
} as const;

describe("WebLucaShell right panel (real-app Phase 3)", () => {
  it("renders Overview rows sourced from the web app runtime", () => {
    const { container, cleanup } = mount(<WebLucaShell {...props} />);
    const text = container.textContent ?? "";
    // Control rows come from webAppRuntime.getControlState, including the
    // mapped LucaLink status passed from the runtime context.
    expect(text).toContain("Luca Prime");
    expect(text).toContain("Local routes");
    expect(text).toContain("LucaLink");
    expect(text).toContain("Connector required");
    cleanup();
  });

  it("switches to the Timeline (activity) empty state", () => {
    const { container, cleanup } = mount(<WebLucaShell {...props} />);
    const timelineTab = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Timeline",
    );
    expect(timelineTab).toBeTruthy();
    act(() => timelineTab!.click());
    expect(container.textContent ?? "").toContain("No activity yet");
    cleanup();
  });
});
