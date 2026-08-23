// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import {
  buildWorkspaceNavGroups,
  WORKSPACE_SURFACES,
  type WorkspaceSurfaceHandlers,
  type WorkspaceSurfaceActivity,
} from "./workspaceNavGroups";
import type { ThreadRailThread } from "../left-panel/sessionsRailModel";

/**
 * The left rail's contract, which is a COUNT before it is anything else.
 *
 * The acceptance criterion in docs/luca-desktop-interface-direction.md §8 is
 * "left rail ≤6 primary items at rest". The old sidebar shipped twelve: a New
 * row, a dead `● Personal` row, eight tool tiles, an Advanced disclosure and
 * Settings. That number is the whole reason this panel was rewritten, so it is
 * pinned here rather than left to a reviewer's eye.
 *
 * The companion criterion is the guardrail — "relocate, don't delete" — so these
 * also assert that the seventeen tools which LEFT the rail are still reachable
 * (via `All tools…`) and that rail mode keeps navigation alive.
 */

const mount = (ui: React.ReactElement) => {
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

/**
 * A PRIMARY item is a nav control that belongs to the rail's own structure —
 * New chat, a tool row, All tools…, Settings. Conversation rows are CONTENT and
 * cap themselves at SESSIONS_RAIL_MAX_ROWS, so they are excluded by their
 * container class rather than by counting only some of them.
 */
const primaryRows = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(".luca-workspace-nav")).filter(
    (el) => !el.closest(".luca-thread-row"),
  );

/**
 * A row's words. The glyph is `aria-hidden`, which hides it from the
 * accessibility tree but NOT from `textContent`, so strip the leading
 * non-alphanumeric run — the glyphs themselves are pinned in
 * workspaceNavGroups.test.ts and do not belong in these expectations.
 */
const labelOf = (el: HTMLElement) =>
  (el.textContent ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();

const textOf = (container: HTMLElement) => container.textContent ?? "";

const noopHandlers = () =>
  Object.fromEntries(
    WORKSPACE_SURFACES.map((surface) => [surface.id, () => {}]),
  ) as WorkspaceSurfaceHandlers;

const groupsWith = (activity: WorkspaceSurfaceActivity = {}) =>
  buildWorkspaceNavGroups(noopHandlers(), activity);

/** Two conversations, one today and one last week, both with content. */
const threads = (): ThreadRailThread[] => {
  const now = Date.now();
  return [
    {
      id: "t-today",
      title: "Q3 investor update",
      updatedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      messages: ["hello"],
    },
    {
      id: "t-earlier",
      title: "Trip planning",
      updatedAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
      messages: ["hello"],
    },
  ];
};

const baseProps = {
  threads: threads(),
  activeThreadId: "t-today",
  groups: groupsWith(),
  onNewSession: () => {},
  onOpenAllTools: () => {},
  onOpenSettings: () => {},
};

let confirmSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // jsdom has no real confirm. Default to "yes" so the destructive path is the
  // one under test; the refusal case overrides it explicitly.
  confirmSpy = vi.fn(() => true);
  window.confirm = confirmSpy as unknown as typeof window.confirm;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WorkspaceSidebar at rest", () => {
  it("keeps six or fewer primary items — the acceptance criterion, as a number", () => {
    const { container, cleanup } = mount(<WorkspaceSidebar {...baseProps} />);
    const labels = primaryRows(container).map(labelOf);
    expect(labels.length).toBeLessThanOrEqual(6);
    // Named, so a regression says WHICH row appeared rather than just "7 > 6".
    expect(labels).toEqual([
      "New chat",
      "Browser",
      "Files",
      "Code",
      "All tools…",
      "Settings",
    ]);
    cleanup();
  });

  it("shows the conversations, bucketed, as content rather than navigation", () => {
    const { container, cleanup } = mount(<WorkspaceSidebar {...baseProps} />);
    expect(container.querySelectorAll(".luca-thread-row")).toHaveLength(2);
    expect(textOf(container)).toContain("Q3 investor update");
    expect(textOf(container)).toContain("Trip planning");
    cleanup();
  });

  it("whispers its section labels in lowercase", () => {
    const { container, cleanup } = mount(<WorkspaceSidebar {...baseProps} />);
    const text = textOf(container);
    expect(text).toContain("today");
    expect(text).toContain("earlier");
    expect(text).toContain("tools");
    // The tracked-out capitals are what made this rail read itself aloud.
    expect(text).not.toContain("TODAY");
    expect(text).not.toContain("TOOLS");
    expect(text).not.toContain("SPACES");
    cleanup();
  });

  it("no longer renders the dead ● Personal row that owned a primary slot", () => {
    const { container, cleanup } = mount(<WorkspaceSidebar {...baseProps} />);
    expect(textOf(container)).not.toContain("Personal");
    cleanup();
  });

  it("leaves the seventeen relocated tools out of the rail entirely", () => {
    const { container, cleanup } = mount(<WorkspaceSidebar {...baseProps} />);
    const text = textOf(container);
    for (const label of ["Hacking", "OSINT", "Dark web", "Stocks", "AI traders"]) {
      expect(text, label).not.toContain(label);
    }
    // …but the door to them is present, which is what makes that a relocation.
    expect(text).toContain("All tools…");
    cleanup();
  });

  it("leads with what is actually running, and only marks that", () => {
    const { container, cleanup } = mount(
      <WorkspaceSidebar {...baseProps} groups={groupsWith({ hacking: true })} />,
    );
    const labels = primaryRows(container).map(labelOf);
    expect(labels[1]).toBe("Hackingrunning");
    // One "running" mark, on the one surface that is open. A tone dot on a tool
    // that is merely *available* is decoration dressed as status.
    expect(labels.filter((l) => l.includes("running"))).toHaveLength(1);
    // The criterion is six "at rest". A live surface is the rail coming FORWARD,
    // which is the same grammar the right panel uses — so it may add one row,
    // and pinned tools are not evicted to make room for it.
    expect(labels.length).toBeLessThanOrEqual(7);
    expect(labels).toContain("Code");
    cleanup();
  });

  it("never grows past one extra row, however much is running", () => {
    const { container, cleanup } = mount(
      <WorkspaceSidebar
        {...baseProps}
        groups={groupsWith({
          agent: true,
          hacking: true,
          osint: true,
          network: true,
          geo: true,
          stock: true,
        })}
      />,
    );
    expect(primaryRows(container).length).toBeLessThanOrEqual(7);
    cleanup();
  });
});

describe("WorkspaceSidebar actions", () => {
  it("starts a thread and lands the caret, from one row", () => {
    const onNewSession = vi.fn();
    const onNewTask = vi.fn();
    const { container, cleanup } = mount(
      <WorkspaceSidebar
        {...baseProps}
        onNewSession={onNewSession}
        onNewTask={onNewTask}
      />,
    );
    const row = primaryRows(container).find((el) => labelOf(el) === "New chat");
    act(() => row?.click());
    expect(onNewSession).toHaveBeenCalledTimes(1);
    expect(onNewTask).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("switches to the conversation you click", () => {
    const onSelectThread = vi.fn();
    const { container, cleanup } = mount(
      <WorkspaceSidebar {...baseProps} onSelectThread={onSelectThread} />,
    );
    const rows = container.querySelectorAll<HTMLElement>(
      ".luca-thread-row .luca-workspace-nav",
    );
    act(() => rows[1]?.click());
    expect(onSelectThread).toHaveBeenCalledWith("t-earlier");
    cleanup();
  });

  it("marks the active conversation, and only that one", () => {
    const { container, cleanup } = mount(<WorkspaceSidebar {...baseProps} />);
    const current = container.querySelectorAll('[aria-current="true"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent).toContain("Q3 investor update");
    cleanup();
  });

  it("opens the tools surface from All tools…", () => {
    const onOpenAllTools = vi.fn();
    const { container, cleanup } = mount(
      <WorkspaceSidebar {...baseProps} onOpenAllTools={onOpenAllTools} />,
    );
    const link = primaryRows(container).find((el) => labelOf(el) === "All tools…");
    act(() => link?.click());
    expect(onOpenAllTools).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("names the conversation in the confirm before deleting it", () => {
    const onDeleteThread = vi.fn();
    const { container, cleanup } = mount(
      <WorkspaceSidebar {...baseProps} onDeleteThread={onDeleteThread} />,
    );
    const forget = container.querySelector<HTMLElement>(
      '[aria-label="Delete Trip planning"]',
    );
    expect(forget).not.toBeNull();
    act(() => forget?.click());
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(String(confirmSpy.mock.calls[0]?.[0])).toContain("Trip planning");
    expect(onDeleteThread).toHaveBeenCalledWith("t-earlier");
    cleanup();
  });

  it("deletes nothing when the confirm is declined — it must fail closed", () => {
    confirmSpy.mockReturnValue(false);
    const onDeleteThread = vi.fn();
    const { container, cleanup } = mount(
      <WorkspaceSidebar {...baseProps} onDeleteThread={onDeleteThread} />,
    );
    act(() =>
      container
        .querySelector<HTMLElement>('[aria-label="Delete Trip planning"]')
        ?.click(),
    );
    expect(onDeleteThread).not.toHaveBeenCalled();
    cleanup();
  });

  it("offers no delete control at all when nothing can consume it", () => {
    const { container, cleanup } = mount(
      <WorkspaceSidebar {...baseProps} onDeleteThread={undefined} />,
    );
    expect(container.querySelectorAll(".luca-thread-forget")).toHaveLength(0);
    cleanup();
  });
});

describe("WorkspaceSidebar in rail mode", () => {
  it("keeps New, the active conversation and Settings reachable at 58px", () => {
    const { container, cleanup } = mount(
      <WorkspaceSidebar {...baseProps} collapsed onToggleCollapsed={() => {}} />,
    );
    const titles = primaryRows(container).map((el) => el.getAttribute("title"));
    expect(titles).toContain("Start a new conversation");
    expect(titles).toContain("Settings");
    expect(titles).toContain("Q3 investor update");
    // Navigation never disappears — the labels fold away, the marks do not.
    expect(titles).toContain("All tools");
    cleanup();
  });

  it("drops the other conversations rather than stacking dots down the rail", () => {
    const { container, cleanup } = mount(
      <WorkspaceSidebar {...baseProps} collapsed onToggleCollapsed={() => {}} />,
    );
    const titles = primaryRows(container).map((el) => el.getAttribute("title"));
    expect(titles).not.toContain("Trip planning");
    cleanup();
  });

  it("keeps the expand control present, or the rail would be a one-way door", () => {
    const onToggleCollapsed = vi.fn();
    const { container, cleanup } = mount(
      <WorkspaceSidebar
        {...baseProps}
        collapsed
        onToggleCollapsed={onToggleCollapsed}
      />,
    );
    const toggle = container.querySelector<HTMLElement>(
      '[aria-label="Expand sidebar"]',
    );
    expect(toggle).not.toBeNull();
    act(() => toggle?.click());
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
    cleanup();
  });
});
