// lucaBrowserAdapter — PR #135: Rename GhostBrowser to LucaBrowser + Governed Browser Adapter.
//
// Pure, side-effect-free helpers that decide which browser surface should host
// an approved safe-URL session and provide the governed-mode boundary copy and
// safer webview props.
//
// Hard guarantees — these helpers NEVER:
//   - instantiate a browser, webview, BrowserWindow, or BrowserView
//   - read the DOM or page content
//   - call the network
//   - perform any browser action (navigate/click/type/submit/download)
// They only inspect a couple of runtime flags and return plain data.

export type LucaBrowserMode = "MANUAL" | "GOVERNED" | "EMBEDDED";

export type LucaBrowserShellAdapter =
  | "luca_browser_webview"
  | "iframe_fallback"
  | "adapter_unavailable";

/**
 * Best-effort, conservative detection of whether an Electron <webview> can be
 * used safely in the current runtime. We only read flags — we never construct
 * a webview here. When uncertain we return false so callers fall back to the
 * safe iframe shell.
 */
export function isElectronWebviewAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const win = window as unknown as {
    electron?: unknown;
    process?: { type?: string };
  };
  // The desktop shell exposes a preload `window.electron` bridge. Treat its
  // presence (or a renderer process) as the desktop/webview indicator.
  if (win.electron) return true;
  if (win.process && win.process.type === "renderer") return true;
  return false;
}

/**
 * Choose the preferred adapter for a governed safe-URL session.
 * desktop/electron webview available -> luca_browser_webview
 * browser/web runtime               -> iframe_fallback
 * no DOM/window at all               -> adapter_unavailable
 */
export function getPreferredBrowserShellAdapter(): LucaBrowserShellAdapter {
  if (typeof window === "undefined") return "adapter_unavailable";
  return isElectronWebviewAvailable() ? "luca_browser_webview" : "iframe_fallback";
}

export function getLucaBrowserModeLabel(mode: LucaBrowserMode): string {
  switch (mode) {
    case "GOVERNED":
      return "Luca Browser — Governed Mode";
    case "EMBEDDED":
      return "Luca Browser — Embedded";
    case "MANUAL":
    default:
      return "Luca Browser — Manual Mode";
  }
}

/**
 * Visible safety-boundary labels shown in governed mode. Mirrors the iframe
 * shell boundary copy from PR #134 so both adapters present the same limits.
 */
export function getGovernedBrowserBoundaryLabels(): string[] {
  return [
    "Luca Browser — Governed Mode",
    "Approved safe URL only",
    "Manual browsing only",
    "No automation",
    "No DOM read",
    "No credentials",
    "No downloads/uploads",
    "No wallet/payment",
  ];
}

/**
 * Safer Electron <webview> attributes for governed mode:
 *   - non-persistent partition (no `persist:` prefix => in-memory, dropped on close)
 *   - popups disabled (no allowpopups attribute)
 *   - nodeIntegration off, contextIsolation on
 * Returned as a plain object; the caller spreads it onto the element. We never
 * touch the webview instance here.
 */
export function getGovernedWebviewProps(shellSessionId?: string): {
  partition: string;
  webpreferences: string;
  allowpopups: false;
} {
  const suffix = shellSessionId ? `:${shellSessionId}` : "";
  return {
    // Intentionally NOT prefixed with `persist:` so no cookies/session data are
    // written to disk for governed sessions.
    partition: `luca-governed${suffix}`,
    webpreferences: "nodeIntegration=no,contextIsolation=yes",
    allowpopups: false,
  };
}
