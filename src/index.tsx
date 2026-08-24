import "./web/webBootPolyfills";
import { setupWindowControlsOverlay } from "./windowControlsOverlay";

setupWindowControlsOverlay();
import {
  isElectronRuntimeSignal,
  selectLucaBootstrapEntry,
  type LucaBootstrapEntry,
} from "./config/bootstrapEntrySelector";

declare global {
  interface Window {
    __LUCA_REACT_ENTRY_LOADED__?: boolean;
    __LUCA_REACT_MOUNT_ATTEMPTED__?: boolean;
    __LUCA_REACT_MOUNTED__?: boolean;
    __LUCA_REACT_BOOTSTRAP_ERROR__?: string;
    __LUCA_BOOT_ERROR__?: string;
    __LUCA_BOOT_ERROR_LISTENERS_REGISTERED__?: boolean;
    __LUCA_CAPTURED_BOOT_ERRORS__?: string[];
    __LUCA_SHOW_BOOT_FAILURE__?: (message?: string, error?: unknown) => void;
    /**
     * Provided by the pre-React loader (index.html). Returns true when it has
     * taken ownership of a *transient* load failure (a bounded reload is
     * scheduled) — the caller must then not paint the failure screen. Lives in
     * the inline script rather than here because this module is itself fetched
     * over the transport that fails, so it cannot be relied on to run.
     */
    __LUCA_TRY_BOOT_RECOVERY__?: (error?: unknown) => boolean;
    /** Resets the reload budget once the app is actually up. */
    __LUCA_CLEAR_BOOT_RECOVERY__?: () => void;
    __LUCA_SET_BOOT_STATUS__?: (
      message: string,
      progress?: number,
      detail?: string,
    ) => void;
    __LUCA_CLEAR_BOOT_STATUS_LOOP__?: () => void;
    /**
     * Provided by the pre-React loader (index.html): swaps the boot checklist
     * to the "LucaOS is ready." summary with a Continue gate and takes over
     * dismissing itself. Returns true when it handled the handoff — the
     * caller must then NOT remove #root-loader.
     */
    __LUCA_BOOT_LOADER_HANDOFF__?: () => boolean;
    __LUCA_SELECTED_ENTRY__?: LucaBootstrapEntry;
    __LUCA_WEB_BRIDGE_MOUNT_ATTEMPTED__?: boolean;
    __LUCA_WEB_BRIDGE_MOUNTED__?: boolean;
    __LUCA_DETECTED_HOST_CLASS__?: string;
    __LUCA_DESKTOP_ENTRY_IMPORTED__?: boolean;
  }
}

const describeBootError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  return String(error);
};

const captureBootError = (error: unknown): void => {
  const description = describeBootError(error);
  window.__LUCA_BOOT_ERROR__ = description;
  window.__LUCA_CAPTURED_BOOT_ERRORS__ ??= [];
  window.__LUCA_CAPTURED_BOOT_ERRORS__.push(description);
};

window.__LUCA_REACT_ENTRY_LOADED__ = true;
window.__LUCA_SET_BOOT_STATUS__?.(
  "Loading LucaOS",
  0.84,
  "Starting the app",
);
console.info("[LucaOS web boot] React bootstrap loaded");

if (!window.__LUCA_BOOT_ERROR_LISTENERS_REGISTERED__) {
  window.__LUCA_BOOT_ERROR_LISTENERS_REGISTERED__ = true;
  window.addEventListener("error", (event) => {
    if (window.__LUCA_REACT_MOUNTED__ !== true) {
      captureBootError(event.error || event.message || "Unknown startup error");
    }
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (window.__LUCA_REACT_MOUNTED__ !== true) {
      captureBootError(event.reason || "Unhandled startup rejection");
    }
  });
}

const selectedEntry = selectLucaBootstrapEntry({
  releaseTarget: import.meta.env.VITE_LUCA_RELEASE_TARGET,
  appMode: import.meta.env.VITE_LUCA_APP_MODE,
  runtimeTarget: import.meta.env.VITE_LUCA_RUNTIME_TARGET,
  hostname: window.location.hostname,
  isElectronRuntime: isElectronRuntimeSignal(window),
  hasBrowserRuntime: true,
});

window.__LUCA_SELECTED_ENTRY__ = selectedEntry;
window.__LUCA_DESKTOP_ENTRY_IMPORTED__ = false;
window.__LUCA_SET_BOOT_STATUS__?.(
  "Opening LucaOS",
  0.88,
  "Choosing the best app experience",
);
console.info(`[LucaOS web boot] selectedEntry=${selectedEntry}`);

const entryMount =
  selectedEntry === "webBridgeEntry"
    ? import("./web/webBridgeEntry").then((module) => {
        window.__LUCA_SET_BOOT_STATUS__?.(
          "Opening LucaOS",
          0.9,
          "Loading the workspace",
        );
        return module.mountLucaWebBridge();
      })
    : import("./reactAppEntry").then((module) => {
        window.__LUCA_DESKTOP_ENTRY_IMPORTED__ = true;
        window.__LUCA_SET_BOOT_STATUS__?.(
          "Opening LucaOS",
          0.9,
          "Loading the desktop app",
        );
        return module.mountLucaReactApp();
      });

entryMount
  .then(() => {
    // The app is up, so give this window its full reload budget back — a blip
    // three hours from now should not be judged against one at startup.
    window.__LUCA_CLEAR_BOOT_RECOVERY__?.();
  })
  .catch((error: unknown) => {
    const description = describeBootError(error);
    window.__LUCA_REACT_BOOTSTRAP_ERROR__ = description;
    captureBootError(error);
    // A dev-server module fetch killed mid-flight by a network change (Wi-Fi
    // flip, VPN, sleep/wake) rejects this import even though the app is fine.
    // The loader can recover from that with a bounded reload — the module map
    // only clears with a new document, so a retry here would refetch nothing.
    // Only report a real failure once recovery has declined to handle it.
    if (window.__LUCA_TRY_BOOT_RECOVERY__?.(error) === true) return;
    console.error("[LucaOS web boot] React app import failed", error);
    window.dispatchEvent(new CustomEvent("luca-react-bootstrap-error"));
  });

export {};
