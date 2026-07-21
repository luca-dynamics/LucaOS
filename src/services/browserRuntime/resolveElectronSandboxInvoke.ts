/**
 * Resolve an Electron sandbox IPC invoke function for ElectronSandboxBrowserDriver.
 * Prefer window.luca.sandbox (typed preload surface); fall back to ipcRenderer.invoke.
 */

import type { ElectronSandboxInvoke } from "./drivers/ElectronSandboxBrowserDriver";

export interface ResolveElectronSandboxInvokeResult {
  ok: boolean;
  invoke?: ElectronSandboxInvoke;
  source?: "luca.sandbox" | "electron.ipcRenderer";
  reason?: string;
}

export function resolveElectronSandboxInvoke(
  win: Window | undefined = typeof window !== "undefined" ? window : undefined,
): ResolveElectronSandboxInvokeResult {
  if (!win) {
    return { ok: false, reason: "No window (not a browser/Electron renderer)." };
  }

  const lucaSandbox = win.luca?.sandbox;
  if (
    lucaSandbox &&
    typeof lucaSandbox.create === "function" &&
    typeof lucaSandbox.execute === "function" &&
    typeof lucaSandbox.destroy === "function"
  ) {
    const invoke: ElectronSandboxInvoke = async (channel, ...args) => {
      switch (channel) {
        case "sandbox:probe":
          return lucaSandbox.probe();
        case "sandbox:create":
          return lucaSandbox.create(args[0]);
        case "sandbox:list":
          return lucaSandbox.list();
        case "sandbox:execute":
          return lucaSandbox.execute(args[0] as string, args[1]);
        case "sandbox:destroy":
          return lucaSandbox.destroy(args[0] as string);
        case "sandbox:snapshot":
          return lucaSandbox.snapshot(args[0] as string);
        case "sandbox:listSnapshots":
          return lucaSandbox.listSnapshots(args[0] as string);
        case "sandbox:cleanupExpired":
          return lucaSandbox.cleanupExpired();
        case "sandbox:exportArtifact":
          return lucaSandbox.exportArtifact(args[0] as string, args[1]);
        case "sandbox:importArtifact":
          return lucaSandbox.importArtifact(args[0] as string, args[1]);
        default:
          throw new Error(`Unsupported sandbox channel: ${channel}`);
      }
    };
    return { ok: true, invoke, source: "luca.sandbox" };
  }

  const ipcInvoke = win.electron?.ipcRenderer?.invoke;
  if (typeof ipcInvoke === "function") {
    return {
      ok: true,
      invoke: (channel, ...args) => ipcInvoke.call(win.electron.ipcRenderer, channel, ...args),
      source: "electron.ipcRenderer",
    };
  }

  return {
    ok: false,
    reason: "Electron sandbox IPC is not available in this runtime.",
  };
}

export function hasElectronSandboxIpc(
  win: Window | undefined = typeof window !== "undefined" ? window : undefined,
): boolean {
  return resolveElectronSandboxInvoke(win).ok;
}
