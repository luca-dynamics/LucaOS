import React from "react";
import ReactDOM from "react-dom/client";
import { WebBridgeShell } from "./WebBridgeShell";

const describeBootError = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

export function mountLucaWebBridge(): void {
  window.__LUCA_WEB_BRIDGE_MOUNT_ATTEMPTED__ = true;
  console.info("[LucaOS web boot] WebBridge mount attempted");

  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error("Could not find root element to mount WebBridge");
    }

    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <WebBridgeShell />
      </React.StrictMode>,
    );

    window.__LUCA_WEB_BRIDGE_MOUNTED__ = true;
    window.__LUCA_REACT_MOUNTED__ = true;
    console.info("[LucaOS web boot] WebBridge mounted");
    document.getElementById("root-loader")?.remove();
  } catch (error) {
    const description = describeBootError(error);
    window.__LUCA_REACT_BOOTSTRAP_ERROR__ = description;
    window.__LUCA_BOOT_ERROR__ = description;
    window.__LUCA_SHOW_BOOT_FAILURE__?.(
      "LucaOS WebBridge failed before mount",
      error,
    );
  }
}
