import { Buffer as BrowserBuffer } from "buffer";

declare global {
  var Buffer: typeof BrowserBuffer;

  interface Window {
    __LUCA_REACT_ENTRY_LOADED__?: boolean;
    __LUCA_REACT_MOUNT_ATTEMPTED__?: boolean;
    __LUCA_REACT_MOUNTED__?: boolean;
    __LUCA_REACT_BOOTSTRAP_ERROR__?: string;
    __LUCA_BOOT_ERROR__?: string;
    __LUCA_BOOT_ERROR_LISTENERS_REGISTERED__?: boolean;
    __LUCA_CAPTURED_BOOT_ERRORS__?: string[];
    __LUCA_SHOW_BOOT_FAILURE__?: (message?: string, error?: unknown) => void;
  }
}

if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = BrowserBuffer;
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

import("./reactAppEntry")
  .then((module) => module.mountLucaReactApp())
  .catch((error: unknown) => {
    const description = describeBootError(error);
    window.__LUCA_REACT_BOOTSTRAP_ERROR__ = description;
    captureBootError(error);
    console.error("[LucaOS web boot] React app import failed", error);
    window.dispatchEvent(new CustomEvent("luca-react-bootstrap-error"));
  });

export {};
