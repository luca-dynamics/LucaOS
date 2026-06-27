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
  browserCapabilities: [] as [],
  guardedNativeCapabilities: [] as [],
};

describe("WebLucaShell right panel (real desktop components)", () => {
  it("mounts the real desktop ControlPanel in Overview", () => {
    const { container, cleanup } = mount(<WebLucaShell {...props} />);
    // ControlPanel renders its governed-control content (permission center,
    // execution readiness), not the old hand-coded rows.
    const text = container.textContent ?? "";
    expect(text).toContain("Permission center");
    expect(text).toContain("Execution readiness");
    cleanup();
  });

  it("switches to the Timeline tab and mounts the real ActivityPanel", () => {
    const { container, cleanup } = mount(<WebLucaShell {...props} />);
    const timelineTab = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Timeline",
    );
    expect(timelineTab).toBeTruthy();
    act(() => timelineTab!.click());
    // ActivityPanel renders runtime activity / pending approvals content.
    expect(container.textContent ?? "").toContain("Pending approvals");
    cleanup();
  });

  it("renders the left workspace sessions from the app runtime", () => {
    const { container, cleanup } = mount(<WebLucaShell {...props} />);
    const session = container.querySelector('[data-luca-web-workspace-session="chat"]');
    expect(session).not.toBeNull();
    expect(session?.textContent ?? "").toContain("Chat");
    expect(container.textContent ?? "").toContain(
      "Luca is ready. Ask anything or open a workspace.",
    );
    cleanup();
  });
});
