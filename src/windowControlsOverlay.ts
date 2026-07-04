/**
 * Window-controls glue (Electron).
 *
 * The window is frameless (titleBarStyle 'hidden', no native overlay): the
 * controls are the shell's OWN ghost buttons in the header, driven over IPC
 * (window-minimize / window-maximize / window-close in main.cjs). That is the
 * only way the cluster can share the exact skin, size, and hover of the other
 * header controls on a translucent, skinnable surface.
 *
 * html.luca-wco is kept for the genuine PWA overlay case (installed web app
 * with a real windowControlsOverlay), where the OS paints controls we must
 * reserve room for.
 */

export function isElectronShell(): boolean {
  return typeof window !== "undefined" && !!(window as any).electron;
}

export function setupWindowControlsOverlay(): void {
  if (typeof document === "undefined") return;
  const overlay = (navigator as any)?.windowControlsOverlay;
  const apply = () =>
    document.documentElement.classList.toggle(
      "luca-wco",
      overlay?.visible === true && !isElectronShell(),
    );
  apply();
  try {
    overlay?.addEventListener?.("geometrychange", apply);
  } catch {
    /* geometry events unavailable — the initial state stands */
  }
}

/** Drive the frameless window from the shell's own control buttons. */
export function sendWindowControl(
  action: "minimize" | "maximize" | "close",
): void {
  try {
    (window as any).electron?.ipcRenderer?.send(`window-${action}`);
  } catch {
    /* IPC unavailable (plain web) — the buttons are not rendered there */
  }
}
