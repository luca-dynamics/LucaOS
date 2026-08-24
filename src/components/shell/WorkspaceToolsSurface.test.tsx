// @vitest-environment jsdom
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceToolsSurface } from "./WorkspaceToolsSurface";
import {
  buildWorkspaceNavGroups,
  WORKSPACE_SURFACES,
  type WorkspaceSurfaceHandlers,
} from "./workspaceNavGroups";

/**
 * The relocation target. The guardrail in the interface direction is "relocate,
 * don't delete", and this surface is the whole of that promise: whatever left the
 * rail has to be reachable here and still open its real modal.
 *
 * Which is why the operator tier is asserted as a DISCLOSURE and never as an
 * absence. Basic folds it; Pro and Creator open it; no mode removes it. Note that
 * `shouldShowAdvancedTools` is `true` in all three modes, so a test that expected
 * Basic to hide these rows would have been testing a permission check that does
 * not exist.
 */

const mount = (ui: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(ui));
  return {
    container,
    rerender: (next: React.ReactElement) => act(() => root.render(next)),
    cleanup: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
};

/** Every handler records its own id into a shared log, so ordering is observable. */
const trackingGroups = (log: string[] = []) => {
  const handlers = Object.fromEntries(
    WORKSPACE_SURFACES.map((surface) => [
      surface.id,
      // A block body, not `() => log.push(...)`: `push` returns a number, and the
      // handler type is `() => void`, so the concise form fails the cast.
      () => {
        log.push(`open:${surface.id}`);
      },
    ]),
  ) as WorkspaceSurfaceHandlers;
  return { groups: buildWorkspaceNavGroups(handlers), log };
};

const rowsOf = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>('[role="dialog"] .luca-workspace-nav'),
  );

const labelsOf = (container: HTMLElement) => rowsOf(container).map((row) => row.textContent ?? "");

/**
 * Typing has to go through the PROTOTYPE's value setter, not `input.value = x`.
 *
 * React installs its own `value` accessor on each controlled node and caches what
 * it last saw there; a direct assignment updates that cache, so by the time the
 * `input` event arrives React compares the node against itself, sees no change,
 * and never calls `onChange`. The filter then appears not to work while the
 * component is perfectly fine. Writing through the untouched prototype setter
 * leaves React's cache stale, which is exactly what makes it notice.
 */
const NATIVE_VALUE_SETTER = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype,
  "value",
)!.set!;

const typeInto = (input: HTMLInputElement, value: string) => {
  act(() => {
    NATIVE_VALUE_SETTER.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const filterField = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>('[aria-label="Filter tools"]')!;

const advancedDisclosure = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("[aria-expanded]")).find((el) =>
    el.textContent?.includes("Advanced"),
  );

describe("WorkspaceToolsSurface", () => {
  it("renders nothing at all while closed — it is summoned, not hidden", () => {
    const { groups } = trackingGroups();
    const { container, cleanup } = mount(
      <WorkspaceToolsSurface
        open={false}
        onClose={() => {}}
        groups={groups}
        experienceMode="pro"
      />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    cleanup();
  });

  it("holds all 21 capabilities — the relocation must not lose one", () => {
    const { groups } = trackingGroups();
    const { container, cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={() => {}}
        groups={groups}
        experienceMode="pro"
      />,
    );
    expect(rowsOf(container)).toHaveLength(21);
    cleanup();
  });

  it("folds the operator tier in Basic, and never removes it", () => {
    const { groups } = trackingGroups();
    const { container, cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={() => {}}
        groups={groups}
        experienceMode="basic"
      />,
    );
    // Eight rows visible, thirteen folded behind a heading that says so.
    expect(rowsOf(container)).toHaveLength(8);
    const fold = advancedDisclosure(container);
    expect(fold).not.toBeUndefined();
    expect(fold?.getAttribute("aria-expanded")).toBe("false");
    // The count is what keeps a closed group from reading as an empty one.
    expect(fold?.textContent).toContain("13");

    // One click reaches them — a door, not a wall.
    act(() => fold?.click());
    expect(rowsOf(container)).toHaveLength(21);
    expect(advancedDisclosure(container)?.getAttribute("aria-expanded")).toBe("true");
    cleanup();
  });

  it("opens the tier from the start for Creator", () => {
    const { groups } = trackingGroups();
    const { container, cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={() => {}}
        groups={groups}
        experienceMode="creator"
      />,
    );
    expect(rowsOf(container)).toHaveLength(21);
    expect(advancedDisclosure(container)?.getAttribute("aria-expanded")).toBe("true");
    cleanup();
  });

  it("lets a Pro user fold the tier away, since the mode is a default not a rule", () => {
    const { groups } = trackingGroups();
    const { container, cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={() => {}}
        groups={groups}
        experienceMode="pro"
      />,
    );
    act(() => advancedDisclosure(container)?.click());
    expect(rowsOf(container)).toHaveLength(8);
    cleanup();
  });

  it("shows each surface's sentence inline, not behind a hover", () => {
    const { groups } = trackingGroups();
    const { container, cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={() => {}}
        groups={groups}
        experienceMode="pro"
      />,
    );
    expect(container.textContent).toContain("Open the ghost browser");
    expect(container.textContent).toContain("Link and hand off to other devices");
    cleanup();
  });

  it("opens the real surface, and closes itself first so it cannot bury it", () => {
    const log: string[] = [];
    const { groups } = trackingGroups(log);
    const { container, cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={() => log.push("close")}
        groups={groups}
        experienceMode="pro"
      />,
    );
    const hacking = rowsOf(container).find((row) =>
      row.textContent?.includes("Hacking"),
    );
    expect(hacking).not.toBeUndefined();
    act(() => hacking?.click());
    // The close must land BEFORE the modal opens, or the overlay sits on top of
    // the thing the click asked for.
    expect(log).toEqual(["close", "open:hacking"]);
    cleanup();
  });

  it("filters on the label", () => {
    const { groups } = trackingGroups();
    const { container, cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={() => {}}
        groups={groups}
        experienceMode="pro"
      />,
    );
    typeInto(filterField(container), "crypt");
    expect(labelsOf(container)).toHaveLength(1);
    expect(labelsOf(container)[0]).toContain("Crypto");
    cleanup();
  });

  it("filters on the sentence too, so you can search for what a tool DOES", () => {
    const { groups } = trackingGroups();
    const { container, cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={() => {}}
        groups={groups}
        experienceMode="pro"
      />,
    );
    // "recorder" appears in no label — only in Screen's hint.
    typeInto(filterField(container), "recorder");
    expect(labelsOf(container)).toHaveLength(1);
    expect(labelsOf(container)[0]).toContain("Screen");
    cleanup();
  });

  it("reaches into the folded tier when you search, rather than reporting nothing", () => {
    const { groups } = trackingGroups();
    const { container, cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={() => {}}
        groups={groups}
        experienceMode="basic"
      />,
    );
    // Basic folds Advanced, and OSINT lives there. A search that answered
    // "Nothing matches" about a row sitting one fold away would be a lie.
    typeInto(filterField(container), "osint");
    expect(labelsOf(container)).toHaveLength(1);
    expect(labelsOf(container)[0]).toContain("OSINT");
    cleanup();
  });

  it("says so when nothing matches, instead of showing an empty panel", () => {
    const { groups } = trackingGroups();
    const { container, cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={() => {}}
        groups={groups}
        experienceMode="pro"
      />,
    );
    typeInto(filterField(container), "zzzz");
    expect(rowsOf(container)).toHaveLength(0);
    expect(container.textContent).toContain("Nothing matches");
    expect(container.textContent).toContain("zzzz");
    cleanup();
  });

  it("forgets the query when it closes — reopening still filtered looks broken", () => {
    const { groups } = trackingGroups();
    const props = {
      onClose: () => {},
      groups,
      experienceMode: "pro" as const,
    };
    const { container, rerender, cleanup } = mount(
      <WorkspaceToolsSurface open {...props} />,
    );
    typeInto(filterField(container), "crypt");
    expect(rowsOf(container)).toHaveLength(1);
    rerender(<WorkspaceToolsSurface open={false} {...props} />);
    rerender(<WorkspaceToolsSurface open {...props} />);
    expect(filterField(container).value).toBe("");
    expect(rowsOf(container)).toHaveLength(21);
    cleanup();
  });

  it("forgets a fold override on close, so the mode's default returns", () => {
    const { groups } = trackingGroups();
    const props = {
      onClose: () => {},
      groups,
      experienceMode: "pro" as const,
    };
    const { container, rerender, cleanup } = mount(
      <WorkspaceToolsSurface open {...props} />,
    );
    act(() => advancedDisclosure(container)?.click());
    expect(rowsOf(container)).toHaveLength(8);
    rerender(<WorkspaceToolsSurface open={false} {...props} />);
    rerender(<WorkspaceToolsSurface open {...props} />);
    expect(rowsOf(container)).toHaveLength(21);
    cleanup();
  });

  it("lands the caret in the filter on open", () => {
    const { groups } = trackingGroups();
    const { container, cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={() => {}}
        groups={groups}
        experienceMode="pro"
      />,
    );
    expect(document.activeElement).toBe(filterField(container));
    cleanup();
  });

  it("dismisses on Escape — the promise its rounded edge makes", () => {
    const { groups } = trackingGroups();
    const onClose = vi.fn();
    const { cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={onClose}
        groups={groups}
        experienceMode="pro"
      />,
    );
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("dismisses when you click back into the conversation behind it", () => {
    const { groups } = trackingGroups();
    const onClose = vi.fn();
    const { cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={onClose}
        groups={groups}
        experienceMode="pro"
      />,
    );
    act(() => {
      document.body.dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true }),
      );
    });
    expect(onClose).toHaveBeenCalled();
    cleanup();
  });

  it("stays put when you click inside it", () => {
    const { groups } = trackingGroups();
    const onClose = vi.fn();
    const { container, cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={onClose}
        groups={groups}
        experienceMode="pro"
      />,
    );
    act(() => {
      filterField(container).dispatchEvent(
        new MouseEvent("pointerdown", { bubbles: true }),
      );
    });
    expect(onClose).not.toHaveBeenCalled();
    cleanup();
  });

  it("has a close control of its own, for pointer users who want one", () => {
    const { groups } = trackingGroups();
    const onClose = vi.fn();
    const { container, cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={onClose}
        groups={groups}
        experienceMode="pro"
      />,
    );
    const close = container.querySelector<HTMLElement>(
      '[aria-label="Close all tools"]',
    );
    expect(close).not.toBeNull();
    act(() => close?.click());
    expect(onClose).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("announces itself as a named dialog rather than a nameless box", () => {
    const { groups } = trackingGroups();
    const { container, cleanup } = mount(
      <WorkspaceToolsSurface
        open
        onClose={() => {}}
        groups={groups}
        experienceMode="pro"
      />,
    );
    expect(
      container.querySelector('[role="dialog"]')?.getAttribute("aria-label"),
    ).toBe("All tools");
    cleanup();
  });
});
