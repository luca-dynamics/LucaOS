import { afterEach, describe, expect, it } from "vitest";
import {
  getGovernedBrowserBoundaryLabels,
  getGovernedWebviewProps,
  getLucaBrowserModeLabel,
  getPreferredBrowserShellAdapter,
  isElectronWebviewAvailable,
} from "./lucaBrowserAdapter";

const globalRef = globalThis as { window?: unknown };
const hadWindow = "window" in globalRef;
const originalWindow = globalRef.window;

afterEach(() => {
  if (hadWindow) globalRef.window = originalWindow;
  else delete globalRef.window;
});

describe("lucaBrowserAdapter", () => {
  it("governed boundary labels cover the no-automation/no-DOM/no-credentials/no-downloads/no-wallet limits", () => {
    const labels = getGovernedBrowserBoundaryLabels();
    expect(labels).toContain("No automation");
    expect(labels).toContain("No DOM read");
    expect(labels).toContain("No credentials");
    expect(labels).toContain("No downloads/uploads");
    expect(labels).toContain("No wallet/payment");
    expect(labels).toContain("Approved safe URL only");
  });

  it("mode label returns the governed-mode string", () => {
    expect(getLucaBrowserModeLabel("GOVERNED")).toBe("Luca Browser — Governed Mode");
    expect(getLucaBrowserModeLabel("MANUAL")).toBe("Luca Browser — Manual Mode");
    expect(getLucaBrowserModeLabel("EMBEDDED")).toBe("Luca Browser — Embedded");
  });

  it("governed webview props use safer, non-persistent settings", () => {
    const props = getGovernedWebviewProps("shell:abc");
    expect(props.partition.startsWith("luca-governed")).toBe(true);
    expect(props.partition.startsWith("persist:")).toBe(false);
    expect(props.partition).toContain("shell:abc");
    expect(props.webpreferences).toContain("nodeIntegration=no");
    expect(props.webpreferences).toContain("contextIsolation=yes");
    expect(props.allowpopups).toBe(false);
  });

  it("prefers iframe fallback when Electron/webview is unavailable", () => {
    globalRef.window = {} as unknown;
    expect(isElectronWebviewAvailable()).toBe(false);
    expect(getPreferredBrowserShellAdapter()).toBe("iframe_fallback");
  });

  it("prefers the LucaBrowser webview when the Electron bridge is present", () => {
    globalRef.window = { electron: {} } as unknown;
    expect(isElectronWebviewAvailable()).toBe(true);
    expect(getPreferredBrowserShellAdapter()).toBe("luca_browser_webview");
  });

  it("reports adapter_unavailable when there is no window at all", () => {
    delete globalRef.window;
    expect(getPreferredBrowserShellAdapter()).toBe("adapter_unavailable");
  });
});
