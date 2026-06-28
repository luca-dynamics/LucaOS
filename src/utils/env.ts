/**
 * Robust environment detection for Luca
 * Helps differentiate between Web, Electron, and Capacitor (Mobile)
 */

export const isElectron = (): boolean => {
  if (typeof window === "undefined") return false;

  const w = window as unknown as {
    electron?: unknown;
    luca?: unknown;
    ipcRenderer?: unknown;
    process?: { versions?: { electron?: unknown } };
  };

  // A genuine Electron host exposes a preload bridge (window.luca / window.electron)
  // and/or process.versions.electron. We REQUIRE one of those real signals — a UA
  // string containing "electron" is NOT enough on its own, because Electron-based
  // *web* browsers (e.g. preview/embedded tools) carry that UA but have no bridge,
  // and trusting it makes the app run Electron-only code (ipcRenderer) that crashes.
  const hasNativeBridge = !!(w.electron || w.luca || w.ipcRenderer);
  if (hasNativeBridge) return true;

  return !!w.process?.versions?.electron;
};

export const isCapacitor = (): boolean => {
  if (typeof window === "undefined") return false;
  return !!(window as any).Capacitor;
};

export const isWeb = (): boolean => {
  return !isElectron() && !isCapacitor();
};
