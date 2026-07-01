// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("idb", () => ({
  openDB: async () => ({
    objectStoreNames: { contains: () => true },
    createObjectStore: () => ({ createIndex: () => undefined }),
    put: async () => undefined,
    get: async () => undefined,
    getAll: async () => [],
    getAllFromIndex: async () => [],
    delete: async () => undefined,
    clear: async () => undefined,
  }),
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

describe("WebRealHeader", () => {
  it("mounts the real desktop Header and wires settings state locally", async () => {
    const { WebRealHeader } = await import("./WebRealHeader");
    const { container, cleanup } = mount(<WebRealHeader />);
    expect(container.querySelector("#app-header")).not.toBeNull();
    expect(container.textContent ?? "").toContain("LucaOS");

    const settingsButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Open settings"]',
    );
    expect(settingsButton).not.toBeNull();
    expect(
      container.querySelector("[data-luca-web-real-header]")?.getAttribute(
        "data-luca-web-settings-open",
      ),
    ).toBe("false");

    act(() => settingsButton!.click());
    expect(
      container.querySelector("[data-luca-web-real-header]")?.getAttribute(
        "data-luca-web-settings-open",
      ),
    ).toBe("true");
    cleanup();
  }, 20000);
});
