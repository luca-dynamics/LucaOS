import { Buffer as BrowserBuffer } from "buffer";

declare global {
  interface Window {
    Buffer?: typeof BrowserBuffer;
  }
}

if (typeof globalThis !== "undefined" && !globalThis.Buffer) {
  globalThis.Buffer = BrowserBuffer;
}

if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = BrowserBuffer;
}
