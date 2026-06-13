export type LucaBootstrapEntry = "webBridgeEntry" | "desktopAppEntry";

export interface BootstrapEntrySignals {
  releaseTarget?: string;
  appMode?: string;
  runtimeTarget?: string;
  hostname?: string;
  isElectronRuntime?: boolean;
  hasBrowserRuntime?: boolean;
}

const normalize = (value?: string): string => (value ?? "").trim().toLowerCase();

export const isElectronRuntimeSignal = (
  windowLike: Pick<Window, "navigator">,
): boolean => {
  const runtimeWindow = windowLike as typeof windowLike & {
    process?: { type?: string };
    electronAPI?: unknown;
  };
  const userAgent = normalize(windowLike.navigator?.userAgent);
  return (
    runtimeWindow.process?.type === "renderer" ||
    runtimeWindow.electronAPI !== undefined ||
    userAgent.includes(" electron/")
  );
};

export const selectLucaBootstrapEntry = ({
  releaseTarget,
  appMode,
  runtimeTarget,
  hostname,
  isElectronRuntime = false,
  hasBrowserRuntime = true,
}: BootstrapEntrySignals): LucaBootstrapEntry => {
  if (isElectronRuntime || !hasBrowserRuntime) {
    return "desktopAppEntry";
  }

  const host = normalize(hostname);
  const explicitWebTarget =
    normalize(releaseTarget) === "web" ||
    normalize(appMode) === "web" ||
    normalize(runtimeTarget) === "vercel";
  const publicWebHost =
    host.endsWith(".vercel.app") ||
    host === "app.lucaos.space" ||
    host.endsWith(".app.lucaos.space");

  // A normal DOM browser is itself a browser-safe host. Explicit deployment
  // signals remain useful diagnostics, but are not required to protect local
  // browser development from importing the native desktop graph.
  return explicitWebTarget || publicWebHost || hasBrowserRuntime
    ? "webBridgeEntry"
    : "desktopAppEntry";
};
