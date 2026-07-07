// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, expect, it, vi } from "vitest";
import { WebLucaShell } from "../WebLucaShell";

vi.mock("../../services/lucaLink/manager", () => ({
  lucaLinkManager: {
    on: vi.fn(),
    off: vi.fn(),
    sendSessionHandoff: vi.fn(),
  },
}));

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
    expect(
      container.querySelector("[data-luca-web-real-settings-surface]"),
    ).toBeNull();

    act(() => settingsButton!.click());

    const settingsSurface = container.querySelector<HTMLElement>(
      "[data-luca-web-real-settings-surface]",
    );
    expect(settingsSurface).not.toBeNull();
    expect(container.textContent ?? "").toContain("Settings");
    expect(
      settingsSurface!.style.getPropertyValue("--app-bg-blur"),
    ).toBeTruthy();
    expect(
      document.documentElement.style.getPropertyValue("--app-bg-blur"),
    ).toBe("");

    const cancelButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Cancel",
    );
    expect(cancelButton).toBeTruthy();
    act(() => cancelButton!.click());
    expect(
      container.querySelector("[data-luca-web-real-settings-surface]"),
    ).toBeNull();

    cleanup();
    vi.unstubAllGlobals();
  });

  it("mounts the real desktop ControlPanel in Overview", () => {
    const { container, cleanup } = mount(<WebLucaShell {...props} />);
    // ControlPanel renders its real current overview content, not old
    // hand-coded WebBridge rows.
    const text = container.textContent ?? "";
    expect(text).toContain("Luca is ready");
    expect(text).toContain("Right now");
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

  it("renders the real desktop operations sidebar in the left panel", () => {
    const { container, cleanup } = mount(<WebLucaShell {...props} />);
    const sidebar = container.querySelector(
      "[data-luca-web-real-operations-sidebar]",
    );
    expect(sidebar).not.toBeNull();
    expect(sidebar?.textContent ?? "").toContain("Quick actions");
    expect(sidebar?.textContent ?? "").toContain("Skills");
    cleanup();
  });

  it("opens and closes the real VoiceHud surface from the Header voice control", () => {
    const { container, cleanup } = mount(<WebLucaShell {...props} />);
    expect(
      container.querySelector("[data-luca-web-real-voice-surface]"),
    ).toBeNull();

    const voiceButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Open voice"]',
    );
    expect(voiceButton).not.toBeNull();

    act(() => voiceButton!.click());
    const voiceSurface = container.querySelector(
      "[data-luca-web-real-voice-surface]",
    );
    expect(voiceSurface).not.toBeNull();
    expect(voiceSurface?.textContent ?? "").toContain("Enable microphone");
    expect(voiceSurface?.textContent ?? "").toContain("Waiting for your voice");

    const closeButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Close voice"]',
    );
    expect(closeButton).not.toBeNull();
    act(() => closeButton!.click());
    expect(
      container.querySelector("[data-luca-web-real-voice-surface]"),
    ).toBeNull();
    cleanup();
  });
});
