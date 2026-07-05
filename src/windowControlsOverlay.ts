/**
 * Window-controls glue (Electron).
 *
 * The window is frameless on Windows, so LucaOS renders its own min/max/close
 * buttons and drives them through Electron IPC. macOS keeps native traffic
 * lights; Linux keeps the native frame.
 */

export function isElectronShell(): boolean {
  return typeof window !== "undefined" && !!(window as any).electron;
}

function electronPlatform(): string | null {
  if (!isElectronShell()) return null;
  const p = (window as any)?.luca?.platform;
  if (typeof p === "string") return p;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (ua.includes("Mac")) return "darwin";
  if (ua.includes("Windows")) return "win32";
  return "linux";
}

function isElectronRoute(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("platform") === "electron";
  } catch {
    return false;
  }
}

function isWindowsUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.includes("Windows");
}

export function rendersOwnWindowControls(options?: {
  allowElectronRouteFallback?: boolean;
}): boolean {
  if (electronPlatform() === "win32") return true;
  return (
    options?.allowElectronRouteFallback === true &&
    isElectronRoute() &&
    isWindowsUserAgent()
  );
}

export function hasMacTrafficLights(): boolean {
  return electronPlatform() === "darwin";
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
    /* geometry events unavailable; the initial state stands. */
  }
}

export function sendWindowControl(
  action: "minimize" | "maximize" | "close",
): void {
  try {
    const lucaAction = (window as any).luca?.[action];
    if (typeof lucaAction === "function") {
      lucaAction();
      return;
    }
    (window as any).electron?.ipcRenderer?.send(`window-${action}`);
  } catch {
    /* IPC unavailable in plain web. */
  }
}
