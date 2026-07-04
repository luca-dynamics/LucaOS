/**
 * Window-controls overlay glue (Electron on Windows).
 *
 * - Flags html.luca-wco so CSS reserves the control cluster's zone. The
 *   navigator API can lag or be absent at boot, so Electron-on-Windows is
 *   treated as overlay-present by construction (the window is created with
 *   titleBarOverlay there).
 * - syncTitleBarOverlay(): the renderer retints the OS control cluster to
 *   match whatever surface it sits on (boot base, header elevated, any
 *   skin) — a static color can only ever match one surface.
 */

function isElectronWindows(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as any).electron &&
    typeof navigator !== "undefined" &&
    navigator.userAgent.includes("Windows")
  );
}

export function setupWindowControlsOverlay(): void {
  if (typeof document === "undefined") return;
  const overlay = (navigator as any)?.windowControlsOverlay;
  const apply = () =>
    document.documentElement.classList.toggle(
      "luca-wco",
      overlay?.visible === true || isElectronWindows(),
    );
  apply();
  try {
    overlay?.addEventListener?.("geometrychange", apply);
  } catch {
    /* geometry events unavailable — the initial state stands */
  }
}

/** Retint the OS window controls to sit invisibly on the given surface. */
export function syncTitleBarOverlay(color?: string, symbolColor?: string): void {
  if (!isElectronWindows() || !color) return;
  try {
    (window as any).electron?.ipcRenderer?.send("luca:set-titlebar-overlay", {
      color,
      symbolColor,
    });
  } catch {
    /* IPC unavailable — the boot color stands */
  }
}
