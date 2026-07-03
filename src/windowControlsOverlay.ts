/**
 * Flags the document when Electron's window-controls overlay is live so CSS
 * can reserve space for the OS min/max/close cluster (html.luca-wco).
 * No-ops silently in browsers and on platforms without the overlay.
 */
export function setupWindowControlsOverlay(): void {
  if (typeof navigator === "undefined" || typeof document === "undefined") {
    return;
  }
  const overlay = (navigator as any).windowControlsOverlay;
  if (!overlay) return;
  const apply = () =>
    document.documentElement.classList.toggle("luca-wco", !!overlay.visible);
  apply();
  try {
    overlay.addEventListener?.("geometrychange", apply);
  } catch {
    /* geometry events unavailable — the initial state stands */
  }
}
