// Desktop shell layout model.
//
// Pure, render-free helpers for the desktop-only collapsible side panels (left
// "Apps" panel and right "Activity" panel). Keeping the constants, aria labels,
// icon resolution and persistence helpers here lets App.tsx stay focused on
// layout and lets us cover the logic with cheap unit tests (no DOM / component
// deps required).
//
// IMPORTANT: nothing here changes runtime, governance, or panel service
// behaviour. These helpers only describe UI shell state.

import type { RightPanelMode } from "../right-panel/rightPanelModel";

/** localStorage keys, matching the existing `luca_*` preference convention. */
export const LEFT_PANEL_COLLAPSED_KEY = "luca_left_panel_collapsed";
export const RIGHT_PANEL_COLLAPSED_KEY = "luca_right_panel_collapsed";

/** Width of the slim collapsed rails (icon-only), within the 56–64px range. */
export const DESKTOP_RAIL_WIDTH_PX = 60;

export interface DesktopPanelWidths {
  sidebar: number;
  right: number;
}

/**
 * Fits desktop panels to the current native-window shape while reserving a
 * useful center workspace. Requested widths remain the user's preference;
 * this resolver only derives the rendered widths for the present viewport.
 */
export function resolveDesktopPanelWidths({
  viewportWidth,
  requested,
  leftVisible = true,
  rightVisible = true,
}: {
  viewportWidth: number;
  requested: DesktopPanelWidths;
  leftVisible?: boolean;
  rightVisible?: boolean;
}): DesktopPanelWidths {
  const width = Math.max(320, viewportWidth);
  const visibleCount = Number(leftVisible) + Number(rightVisible);
  if (visibleCount === 0) return { sidebar: 0, right: 0 };

  const centerReserve = Math.min(520, Math.max(180, width * 0.46));
  const resizeGutters = visibleCount * 6;
  const sideBudget = Math.max(0, width - centerReserve - resizeGutters);
  const minimumSide = Math.min(220, sideBudget / visibleCount);

  if (visibleCount === 1) {
    return {
      sidebar: leftVisible
        ? Math.max(minimumSide, Math.min(requested.sidebar, sideBudget))
        : 0,
      right: rightVisible
        ? Math.max(minimumSide, Math.min(requested.right, sideBudget))
        : 0,
    };
  }

  const requestedTotal = Math.max(1, requested.sidebar + requested.right);
  const preferredLeft = sideBudget * (requested.sidebar / requestedTotal);
  const sidebar = Math.max(
    minimumSide,
    Math.min(preferredLeft, sideBudget - minimumSide),
  );
  return { sidebar, right: Math.max(minimumSide, sideBudget - sidebar) };
}

// Accessible labels for the icon-only collapse/expand controls.
export const COLLAPSE_APPS_LABEL = "Collapse Apps panel";
export const EXPAND_APPS_LABEL = "Expand Apps panel";
export const COLLAPSE_ACTIVITY_LABEL = "Collapse Activity panel";
export const EXPAND_ACTIVITY_LABEL = "Expand Activity panel";

export interface ShellToggleIcon {
  /** Icon name passed to the shared <Icon /> component. */
  name: string;
  /** Accessible label for the control. */
  label: string;
}

/**
 * Icon + aria-label for the left (Apps) panel toggle. When the panel is
 * expanded the control collapses it (and vice versa).
 */
export function leftToggleIcon(collapsed: boolean): ShellToggleIcon {
  return collapsed
    ? { name: "PanelLeftOpen", label: EXPAND_APPS_LABEL }
    : { name: "PanelLeftClose", label: COLLAPSE_APPS_LABEL };
}

/**
 * Icon + aria-label for the right (Activity) panel toggle.
 */
export function rightToggleIcon(collapsed: boolean): ShellToggleIcon {
  return collapsed
    ? { name: "PanelRightOpen", label: EXPAND_ACTIVITY_LABEL }
    : { name: "PanelRightClose", label: COLLAPSE_ACTIVITY_LABEL };
}

export interface ActivityRailIcon {
  /** Right-panel mode this icon navigates to (safe local UI state only). */
  mode: RightPanelMode;
  /** Icon name passed to the shared <Icon /> component. */
  icon: string;
  /** Accessible label / tooltip. */
  label: string;
}

/**
 * Read-only navigation icons for the collapsed Activity rail. Selecting one
 * only switches `rightPanelMode` — the same safe local UI behaviour the
 * expanded header tabs already use. No approve/run/execute controls.
 */
export const ACTIVITY_RAIL_ICONS: readonly ActivityRailIcon[] = [
  { mode: "CONTROL", icon: "LayoutDashboard", label: "Now" },
  { mode: "ACTIVITY", icon: "Activity", label: "Timeline" },
  { mode: "MEMORY", icon: "Brain", label: "Memory" },
  { mode: "LOGS", icon: "Terminal", label: "Trace" },
] as const;

/** Parse a stored preference string into a boolean (mirrors `=== "true"`). */
export function parseCollapsedPreference(raw: string | null | undefined): boolean {
  return raw === "true";
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Read a persisted collapsed preference. Defaults to `false` (expanded) and is
 * safe when storage is unavailable or throws (e.g. privacy mode).
 */
export function readCollapsedPreference(
  key: string,
  storage?: StorageLike,
): boolean {
  const target = resolveStorage(storage);
  if (!target) return false;
  try {
    return parseCollapsedPreference(target.getItem(key));
  } catch {
    return false;
  }
}

/**
 * Persist a collapsed preference. No-op (never throws) when storage is
 * unavailable.
 */
export function writeCollapsedPreference(
  key: string,
  value: boolean,
  storage?: StorageLike,
): void {
  const target = resolveStorage(storage);
  if (!target) return;
  try {
    target.setItem(key, value ? "true" : "false");
  } catch {
    // Ignore storage failures — collapsed state still works in-memory.
  }
}
