import { describe, expect, it } from "vitest";
import {
  ACTIVITY_RAIL_ICONS,
  COLLAPSE_ACTIVITY_LABEL,
  COLLAPSE_APPS_LABEL,
  DESKTOP_RAIL_WIDTH_PX,
  EXPAND_ACTIVITY_LABEL,
  EXPAND_APPS_LABEL,
  LEFT_PANEL_COLLAPSED_KEY,
  RIGHT_PANEL_COLLAPSED_KEY,
  leftToggleIcon,
  parseCollapsedPreference,
  readCollapsedPreference,
  resolveDesktopPanelWidths,
  rightToggleIcon,
  writeCollapsedPreference,
} from "./desktopShellModel";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    dump: () => Object.fromEntries(store),
  };
}

describe("desktopShellModel", () => {
  it("keeps the collapsed rail within the 56–64px range", () => {
    expect(DESKTOP_RAIL_WIDTH_PX).toBeGreaterThanOrEqual(56);
    expect(DESKTOP_RAIL_WIDTH_PX).toBeLessThanOrEqual(64);
  });

  it("resolves left toggle icon + aria-label based on collapsed state", () => {
    expect(leftToggleIcon(false)).toEqual({
      name: "PanelLeftClose",
      label: COLLAPSE_APPS_LABEL,
    });
    expect(leftToggleIcon(true)).toEqual({
      name: "PanelLeftOpen",
      label: EXPAND_APPS_LABEL,
    });
  });

  it("resolves right toggle icon + aria-label based on collapsed state", () => {
    expect(rightToggleIcon(false)).toEqual({
      name: "PanelRightClose",
      label: COLLAPSE_ACTIVITY_LABEL,
    });
    expect(rightToggleIcon(true)).toEqual({
      name: "PanelRightOpen",
      label: EXPAND_ACTIVITY_LABEL,
    });
  });

  it("maps activity rail icons to the four right-panel modes", () => {
    expect(ACTIVITY_RAIL_ICONS.map((i) => i.mode)).toEqual([
      "CONTROL",
      "ACTIVITY",
      "MEMORY",
      "LOGS",
    ]);
    expect(ACTIVITY_RAIL_ICONS.map((i) => i.label)).toEqual([
      "Now",
      "Timeline",
      "Memory",
      "Trace",
    ]);
  });

  it("parses persisted preference strings strictly", () => {
    expect(parseCollapsedPreference("true")).toBe(true);
    expect(parseCollapsedPreference("false")).toBe(false);
    expect(parseCollapsedPreference(null)).toBe(false);
    expect(parseCollapsedPreference(undefined)).toBe(false);
    expect(parseCollapsedPreference("1")).toBe(false);
  });

  it("round-trips collapsed preferences through storage", () => {
    const storage = createMemoryStorage();
    expect(readCollapsedPreference(LEFT_PANEL_COLLAPSED_KEY, storage)).toBe(false);

    writeCollapsedPreference(LEFT_PANEL_COLLAPSED_KEY, true, storage);
    writeCollapsedPreference(RIGHT_PANEL_COLLAPSED_KEY, false, storage);

    expect(readCollapsedPreference(LEFT_PANEL_COLLAPSED_KEY, storage)).toBe(true);
    expect(readCollapsedPreference(RIGHT_PANEL_COLLAPSED_KEY, storage)).toBe(false);
    expect(storage.dump()).toEqual({
      [LEFT_PANEL_COLLAPSED_KEY]: "true",
      [RIGHT_PANEL_COLLAPSED_KEY]: "false",
    });
  });

  it("is safe when storage throws", () => {
    const throwingStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readCollapsedPreference(LEFT_PANEL_COLLAPSED_KEY, throwingStorage)).toBe(
      false,
    );
    expect(() =>
      writeCollapsedPreference(LEFT_PANEL_COLLAPSED_KEY, true, throwingStorage),
    ).not.toThrow();
  });

  it("preserves requested proportions while reserving the center workspace", () => {
    const wide = resolveDesktopPanelWidths({
      viewportWidth: 1440,
      requested: { sidebar: 320, right: 380 },
    });
    expect(wide.sidebar / wide.right).toBeCloseTo(320 / 380, 2);
    expect(1440 - wide.sidebar - wide.right).toBeGreaterThanOrEqual(520);
  });

  it("shrinks both panels proportionally for narrow desktop windows", () => {
    const narrow = resolveDesktopPanelWidths({
      viewportWidth: 620,
      requested: { sidebar: 320, right: 380 },
    });
    expect(narrow.sidebar).toBeGreaterThan(0);
    expect(narrow.right).toBeGreaterThan(0);
    expect(narrow.sidebar + narrow.right).toBeLessThan(440);
  });

  it("gives the available side budget to the only visible panel", () => {
    expect(resolveDesktopPanelWidths({
      viewportWidth: 700,
      requested: { sidebar: 320, right: 380 },
      leftVisible: false,
    })).toEqual({ sidebar: 0, right: 372 });
  });
});
