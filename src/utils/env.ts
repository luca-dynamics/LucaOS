/**
 * Robust environment detection for Luca
 * Helps differentiate between Web, Electron, and Capacitor (Mobile)
 */

export const isElectron = (): boolean => {
  if (typeof window === "undefined") return false;

  return !!(
    (window as any).electron ||
    (window as any).ipcRenderer ||
    (window as any).process?.versions?.electron ||
    navigator.userAgent.toLowerCase().includes("electron") ||
    // Checks for specific URL param if main.js appends it
    new URLSearchParams(window.location.search).get("platform") === "electron" ||
    // Additional check for cases where electron object might be nested or shadowed
    (window as any).navigator?.userAgent?.toLowerCase().includes("electron")
  );
};

export const isCapacitor = (): boolean => {
  if (typeof window === "undefined") return false;
  return !!(window as any).Capacitor;
};

export const isWeb = (): boolean => {
  return !isElectron() && !isCapacitor();
};
