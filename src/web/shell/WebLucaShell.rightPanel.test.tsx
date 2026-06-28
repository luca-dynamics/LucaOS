// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, expect, it, vi } from "vitest";
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
  it("opens the real SettingsModal from the real Header without mutating the document root preview", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({}),
      })),
    );

    const { container, cleanup } = mount(<WebLucaShell {...props} />);
    const settingsButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Open settings"]',
    );
    expect(settingsButton).not.toBeNull();
    expect(container.querySelector("[data-luca-web-real-settings-surface]")).toBeNull();

    act(() => settingsButton!.click());

    const settingsSurface = container.querySelector<HTMLElement>(
      "[data-luca-web-real-settings-surface]",
    );
    expect(settingsSurface).not.toBeNull();
    expect(container.textContent ?? "").toContain("Settings");
    expect(settingsSurface!.style.getPropertyValue("--app-bg-blur")).toBeTruthy();
    expect(document.documentElement.style.getPropertyValue("--app-bg-blur")).toBe("");

    const cancelButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Cancel",
    );
    expect(cancelButton).toBeTruthy();
    act(() => cancelButton!.click());
    expect(container.querySelector("[data-luca-web-real-settings-surface]")).toBeNull();

    cleanup();
    vi.unstubAllGlobals();
  });

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
