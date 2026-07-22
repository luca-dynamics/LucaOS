// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { WorkspaceShell } from "./WorkspaceShell";

/**
 * The frame's contract. These assert the promises the shell makes to every
 * panel that will live inside it — that the frame is the constant, that
 * collapsing is remembered, and that hiding a panel never hides the fact that
 * something needs you.
 */

const mountShell = (ui: React.ReactElement) => {
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
};

const shellOf = (container: HTMLElement) =>
  container.querySelector("[data-luca-workspace-shell]") as HTMLElement;

/**
 * Panels receive `collapsed` / `onToggleCollapsed` from the shell and render
 * their own control — the shell owns the STATE, the panel owns its chrome.
 * These stubs stand in for WorkspaceSidebar and OperationCenter so the tests
 * exercise that contract rather than a mock of it.
 */
const SidebarStub: React.FC<{ collapsed?: boolean; onToggleCollapsed?: () => void }> = ({
  collapsed,
  onToggleCollapsed,
}) => (
  <div data-testid="sidebar" data-collapsed={collapsed ? "true" : "false"}>
    <button type="button" aria-label="Collapse sidebar" onClick={onToggleCollapsed}>
      ⟨
    </button>
  </div>
);

const OpsStub: React.FC<{ onToggleCollapsed?: () => void }> = ({ onToggleCollapsed }) => (
  <div data-testid="ops">
    <button
      type="button"
      aria-label="Collapse Operation Center"
      onClick={onToggleCollapsed}
    >
      ⟩
    </button>
  </div>
);

const baseProps = {
  sidebar: <SidebarStub />,
  centre: <div data-testid="centre">thread</div>,
  operationCenter: <OpsStub />,
};

beforeEach(() => {
  localStorage.clear();
  // jsdom has no matchMedia; the shell must survive its absence and default
  // to the roomy layout rather than throwing.
  // @ts-expect-error — deliberately removing the API for the default case.
  delete window.matchMedia;
});

describe("WorkspaceShell", () => {
  it("lays out sidebar, centre and operation centre by default", () => {
    const { container, cleanup } = mountShell(<WorkspaceShell {...baseProps} />);
    const shell = shellOf(container);

    expect(shell).not.toBeNull();
    expect(shell.dataset.sidebar).toBe("open");
    expect(shell.dataset.ops).toBe("open");
    expect(container.querySelector('[data-testid="sidebar"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="centre"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="ops"]')).not.toBeNull();

    cleanup();
  });

  it("adds the canvas column only when a canvas is supplied", () => {
    const without = mountShell(<WorkspaceShell {...baseProps} />);
    const columnsWithout = shellOf(without.container).style.gridTemplateColumns;
    without.cleanup();

    const withCanvas = mountShell(
      <WorkspaceShell {...baseProps} canvas={<div data-testid="canvas">doc</div>} />,
    );
    const columnsWith = shellOf(withCanvas.container).style.gridTemplateColumns;

    // Overview mode drops the canvas; the other columns must not move.
    expect(columnsWith.split(" ").length).toBeGreaterThan(
      columnsWithout.split(" ").length,
    );
    expect(withCanvas.container.querySelector('[data-testid="canvas"]')).not.toBeNull();
    withCanvas.cleanup();
  });

  it("collapses the sidebar to a rail rather than removing it", () => {
    const { container, cleanup } = mountShell(<WorkspaceShell {...baseProps} />);
    const toggle = container.querySelector(
      '[aria-label="Collapse sidebar"]',
    ) as HTMLButtonElement;
    expect(toggle).not.toBeNull();

    act(() => toggle.click());

    const shell = shellOf(container);
    expect(shell.dataset.sidebar).toBe("rail");
    // Navigation must still be reachable — a rail, not a disappearance.
    expect(container.querySelector('[data-testid="sidebar"]')).not.toBeNull();

    cleanup();
  });

  it("surfaces a restore handle carrying the pending count once ops is closed", () => {
    const { container, cleanup } = mountShell(
      <WorkspaceShell {...baseProps} pendingCount={2} />,
    );

    expect(container.querySelector(".luca-workspace-handle")).toBeNull();

    const toggle = container.querySelector(
      '[aria-label="Collapse Operation Center"]',
    ) as HTMLButtonElement;
    act(() => toggle.click());

    const handle = container.querySelector(".luca-workspace-handle") as HTMLElement;
    expect(handle).not.toBeNull();
    // Hiding the panel must not hide that something needs you.
    expect(handle.textContent).toContain("2");

    act(() => handle.click());
    expect(shellOf(container).dataset.ops).toBe("open");

    cleanup();
  });

  it("remembers collapse across mounts", () => {
    const first = mountShell(<WorkspaceShell {...baseProps} />);
    const toggle = first.container.querySelector(
      '[aria-label="Collapse sidebar"]',
    ) as HTMLButtonElement;
    act(() => toggle.click());
    first.cleanup();

    const second = mountShell(<WorkspaceShell {...baseProps} />);
    expect(shellOf(second.container).dataset.sidebar).toBe("rail");
    second.cleanup();
  });

  it("carries the centre alone on compact viewports, preserving the preference", () => {
    localStorage.setItem(
      "LUCA_WORKSPACE_PANELS",
      JSON.stringify({ sidebarCollapsed: false, opsCollapsed: false }),
    );
    // @ts-expect-error — narrow viewport for this case only.
    window.matchMedia = (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    });

    const { container, cleanup } = mountShell(<WorkspaceShell {...baseProps} />);
    const shell = shellOf(container);

    expect(shell.dataset.compact).toBe("true");
    expect(shell.style.gridTemplateColumns).toBe("1fr");
    expect(container.querySelector('[data-testid="centre"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="sidebar"]')).toBeNull();

    // The stored preference is untouched, so widening restores what they had.
    expect(JSON.parse(localStorage.getItem("LUCA_WORKSPACE_PANELS") || "{}")).toEqual({
      sidebarCollapsed: false,
      opsCollapsed: false,
    });

    cleanup();
  });

  it("does not mutate document root or body styles", () => {
    const rootBefore = document.documentElement.getAttribute("style");
    const bodyBefore = document.body.getAttribute("style");

    const { cleanup } = mountShell(<WorkspaceShell {...baseProps} />);

    expect(document.documentElement.getAttribute("style")).toBe(rootBefore);
    expect(document.body.getAttribute("style")).toBe(bodyBefore);

    cleanup();
  });
});
