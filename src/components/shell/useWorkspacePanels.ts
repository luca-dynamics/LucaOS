import { useCallback, useEffect, useState } from "react";

/**
 * useWorkspacePanels — collapse state for the shell's two side panels.
 *
 * Persisted, because a panel that reopens itself every launch is not a
 * preference, it is a nag. Stored in localStorage rather than settingsService
 * so the frame can render at first paint without waiting on the settings
 * round-trip — layout that flickers into place is the opposite of calm.
 *
 * Below the compact breakpoint the side panels are not collapsible, they are
 * simply absent (see WorkspaceShell), so the stored preference is preserved
 * untouched and restored when the window widens again.
 */

const STORAGE_KEY = "LUCA_WORKSPACE_PANELS";
export const WORKSPACE_COMPACT_QUERY = "(max-width: 900px)";

export interface WorkspacePanelState {
  sidebarCollapsed: boolean;
  opsCollapsed: boolean;
}

const DEFAULTS: WorkspacePanelState = {
  sidebarCollapsed: false,
  opsCollapsed: false,
};

const read = (): WorkspacePanelState => {
  if (typeof localStorage === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<WorkspacePanelState>;
    return {
      sidebarCollapsed: Boolean(parsed.sidebarCollapsed),
      opsCollapsed: Boolean(parsed.opsCollapsed),
    };
  } catch {
    return DEFAULTS;
  }
};

export interface UseWorkspacePanelsResult extends WorkspacePanelState {
  /** True when the viewport is too narrow to carry side panels at all. */
  compact: boolean;
  toggleSidebar: () => void;
  toggleOps: () => void;
}

export function useWorkspacePanels(): UseWorkspacePanelsResult {
  const [state, setState] = useState<WorkspacePanelState>(read);
  const [compact, setCompact] = useState<boolean>(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(WORKSPACE_COMPACT_QUERY).matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(WORKSPACE_COMPACT_QUERY);
    const onChange = (event: MediaQueryListEvent) => setCompact(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* private mode / quota — the frame still works, it just won't remember */
    }
  }, [state]);

  const toggleSidebar = useCallback(
    () => setState((s) => ({ ...s, sidebarCollapsed: !s.sidebarCollapsed })),
    [],
  );
  const toggleOps = useCallback(
    () => setState((s) => ({ ...s, opsCollapsed: !s.opsCollapsed })),
    [],
  );

  return { ...state, compact, toggleSidebar, toggleOps };
}
