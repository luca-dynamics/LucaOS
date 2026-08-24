import { describe, expect, it } from "vitest";
import {
  SIDEBAR_TOOL_ROW_LIMIT,
  WORKSPACE_NAV_GROUPS,
  WORKSPACE_SURFACES,
  buildWorkspaceNavGroups,
  selectSidebarToolRows,
  type WorkspaceNavGroup,
  type WorkspaceSurfaceHandlers,
  type WorkspaceSurfaceId,
} from "./workspaceNavGroups";

/**
 * The catalogue used to be an object literal inside App.tsx's JSX, where the only
 * reader was React. These are the questions that were previously answered by
 * scrolling: how many surfaces are there, is anything listed twice, is anything
 * unreachable, and does the rail's cap actually cap.
 */

/** Every handler records its own id, so "which one fired" is observable. */
function trackingHandlers(): {
  handlers: WorkspaceSurfaceHandlers;
  opened: WorkspaceSurfaceId[];
} {
  const opened: WorkspaceSurfaceId[] = [];
  const handlers = Object.fromEntries(
    WORKSPACE_SURFACES.map((surface) => [
      surface.id,
      // A block body, not `() => opened.push(...)`: `push` returns a number, and
      // the handler type is `() => void`, so the concise form fails the cast.
      () => {
        opened.push(surface.id);
      },
    ]),
  ) as WorkspaceSurfaceHandlers;
  return { handlers, opened };
}

describe("WORKSPACE_SURFACES", () => {
  it("keeps all 21 capabilities — relocating them must never lose one", () => {
    expect(WORKSPACE_SURFACES).toHaveLength(21);
  });

  it("lists every surface exactly once", () => {
    const ids = WORKSPACE_SURFACES.map((surface) => surface.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every surface a label, a glyph and a sentence", () => {
    for (const surface of WORKSPACE_SURFACES) {
      expect(surface.label.trim(), surface.id).not.toBe("");
      expect(surface.glyph.trim(), surface.id).not.toBe("");
      expect(surface.hint.trim(), surface.id).not.toBe("");
    }
  });

  it("puts every surface in a declared group", () => {
    const declared = new Set(WORKSPACE_NAV_GROUPS.map((group) => group.id));
    for (const surface of WORKSPACE_SURFACES) {
      expect(declared.has(surface.group), surface.id).toBe(true);
    }
  });

  it("pins exactly the three that fit the rail's budget", () => {
    // Six primary items at rest = New + three tools + All tools… + Settings.
    // A fourth pin would spend a slot the rail does not have.
    expect(
      WORKSPACE_SURFACES.filter((surface) => surface.pinned).map((s) => s.id),
    ).toEqual(["browser", "files", "code"]);
  });

  it("keeps the operator tier in one gated group, not scattered", () => {
    const advancedGroups = WORKSPACE_NAV_GROUPS.filter((group) => group.advanced);
    expect(advancedGroups.map((group) => group.id)).toEqual(["advanced"]);
    expect(
      WORKSPACE_SURFACES.filter((surface) => surface.group === "advanced"),
    ).toHaveLength(13);
  });

  it("never pins a surface that is behind the operator gate", () => {
    // A pinned advanced surface would sit in the rail for a Basic user while the
    // group it belongs to is hidden — reachable by accident, not by design.
    const gated = new Set(
      WORKSPACE_NAV_GROUPS.filter((g) => g.advanced).map((g) => g.id),
    );
    for (const surface of WORKSPACE_SURFACES) {
      if (surface.pinned) expect(gated.has(surface.group), surface.id).toBe(false);
    }
  });
});

describe("buildWorkspaceNavGroups", () => {
  it("wires every surface to its own handler", () => {
    const { handlers, opened } = trackingHandlers();
    const groups = buildWorkspaceNavGroups(handlers);
    const items = groups.flatMap((group) => group.items);
    expect(items).toHaveLength(21);
    for (const item of items) item.onOpen();
    expect(opened).toEqual(items.map((item) => item.id));
  });

  it("preserves group order and marks only the operator tier advanced", () => {
    const { handlers } = trackingHandlers();
    const groups = buildWorkspaceNavGroups(handlers);
    expect(groups.map((group) => group.id)).toEqual([
      "intelligence",
      "connections",
      "tools",
      "advanced",
    ]);
    expect(groups.filter((group) => group.advanced).map((g) => g.id)).toEqual([
      "advanced",
    ]);
  });

  it("carries the catalogue's own labels, glyphs and sentences through", () => {
    const { handlers } = trackingHandlers();
    const groups = buildWorkspaceNavGroups(handlers);
    const browser = groups
      .flatMap((group) => group.items)
      .find((item) => item.id === "browser");
    expect(browser).toMatchObject({
      label: "Browser",
      glyph: "◎",
      hint: "Open the ghost browser",
      pinned: true,
    });
  });

  it("marks running only what activity says is running", () => {
    const { handlers } = trackingHandlers();
    const groups = buildWorkspaceNavGroups(handlers, { code: true });
    const running = groups
      .flatMap((group) => group.items)
      .filter((item) => item.running);
    expect(running.map((item) => item.id)).toEqual(["code"]);
  });

  it("treats a false activity flag as not running", () => {
    const { handlers } = trackingHandlers();
    const groups = buildWorkspaceNavGroups(handlers, { code: false });
    expect(
      groups.flatMap((group) => group.items).some((item) => item.running),
    ).toBe(false);
  });
});

describe("selectSidebarToolRows", () => {
  const { handlers } = trackingHandlers();

  it("shows the three pinned tools when nothing is running", () => {
    const rows = selectSidebarToolRows(buildWorkspaceNavGroups(handlers));
    expect(rows.map((row) => row.id)).toEqual(["browser", "files", "code"]);
  });

  it("puts running tools first — the rail should lead with what is live", () => {
    const groups = buildWorkspaceNavGroups(handlers, { hacking: true });
    const rows = selectSidebarToolRows(groups);
    expect(rows[0]?.id).toBe("hacking");
  });

  it("never lists a pinned tool twice because it is also running", () => {
    const groups = buildWorkspaceNavGroups(handlers, { browser: true });
    const ids = selectSidebarToolRows(groups).map((row) => row.id);
    expect(ids.filter((id) => id === "browser")).toHaveLength(1);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("caps the list, so the rail can never grow back into a capability pad", () => {
    const groups = buildWorkspaceNavGroups(handlers, {
      agent: true,
      hacking: true,
      osint: true,
      network: true,
      geo: true,
      stock: true,
    });
    expect(selectSidebarToolRows(groups)).toHaveLength(SIDEBAR_TOOL_ROW_LIMIT);
  });

  it("returns nothing for an empty catalogue rather than throwing", () => {
    expect(selectSidebarToolRows([] as WorkspaceNavGroup[])).toEqual([]);
  });
});
