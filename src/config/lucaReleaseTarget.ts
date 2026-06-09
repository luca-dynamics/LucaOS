export type LucaReleaseTarget = "web" | "desktop" | "mobile";
export type LucaRuntimeTarget =
  | "vercel"
  | "local"
  | "electron"
  | "capacitor";

export interface LucaCapabilities {
  bootUi: boolean;
  onboarding: boolean;
  dashboard: boolean;
  settings: boolean;
  modelManagerUi: boolean;
  personalIntelligenceUi: boolean;
  lucaLinkUi: boolean;
  cloudModelRouting: boolean;
  byok: boolean;
  remoteApiBridge: boolean;
  desktopRuntime: boolean;
  electronIpc: boolean;
  localModelScan: boolean;
  localOllamaInstall: boolean;
  localFilesystemMemory: boolean;
  nativeDeviceControl: boolean;
  nativeLucaLinkHostControl: boolean;
}

type LucaReleaseEnvironment = Partial<
  Record<
    | "VITE_LUCA_RELEASE_TARGET"
    | "VITE_LUCA_RUNTIME_TARGET"
    | "VITE_ENABLE_DESKTOP_RUNTIME"
    | "VITE_ENABLE_LOCAL_MODEL_SCAN"
    | "VITE_ENABLE_LOCAL_OLLAMA"
    | "VITE_ENABLE_FILESYSTEM_MEMORY"
    | "VITE_ENABLE_LUCALINK_NATIVE_CONTROL",
    string
  >
>;

const releaseEnvironment: LucaReleaseEnvironment = {
  VITE_LUCA_RELEASE_TARGET: import.meta.env.VITE_LUCA_RELEASE_TARGET,
  VITE_LUCA_RUNTIME_TARGET: import.meta.env.VITE_LUCA_RUNTIME_TARGET,
};

const isRuntimeTarget = (value?: string): value is LucaRuntimeTarget =>
  value === "vercel" ||
  value === "local" ||
  value === "electron" ||
  value === "capacitor";

const isReleaseTarget = (value?: string): value is LucaReleaseTarget =>
  value === "web" || value === "desktop" || value === "mobile";

const detectNativeRuntime = (): LucaRuntimeTarget => {
  if (typeof window === "undefined") return "local";

  if ((window as any).Capacitor) return "capacitor";

  const userAgent = window.navigator?.userAgent?.toLowerCase() ?? "";
  if (
    (window as any).electron ||
    (window as any).ipcRenderer ||
    (window as any).process?.versions?.electron ||
    userAgent.includes("electron") ||
    new URLSearchParams(window.location.search).get("platform") === "electron"
  ) {
    return "electron";
  }

  return "local";
};

export const resolveRuntimeTarget = (
  environment: LucaReleaseEnvironment = releaseEnvironment,
): LucaRuntimeTarget => {
  const configuredTarget = environment.VITE_LUCA_RUNTIME_TARGET;
  return isRuntimeTarget(configuredTarget)
    ? configuredTarget
    : detectNativeRuntime();
};

export const resolveReleaseTarget = (
  environment: LucaReleaseEnvironment = releaseEnvironment,
  resolvedRuntimeTarget = resolveRuntimeTarget(environment),
): LucaReleaseTarget => {
  const configuredTarget = environment.VITE_LUCA_RELEASE_TARGET;
  if (isReleaseTarget(configuredTarget)) return configuredTarget;
  if (resolvedRuntimeTarget === "electron") return "desktop";
  if (resolvedRuntimeTarget === "capacitor") return "mobile";
  return "web";
};

export const runtimeTarget = resolveRuntimeTarget();
export const releaseTarget = resolveReleaseTarget(
  releaseEnvironment,
  runtimeTarget,
);

export const isWeb = releaseTarget === "web";
export const isVercelWeb = isWeb && runtimeTarget === "vercel";
export const isDesktop = releaseTarget === "desktop";
export const isMobile = releaseTarget === "mobile";

const sharedUiCapabilities = {
  bootUi: true,
  onboarding: true,
  dashboard: true,
  settings: true,
  modelManagerUi: true,
  personalIntelligenceUi: true,
  lucaLinkUi: true,
  cloudModelRouting: true,
  byok: true,
  remoteApiBridge: true,
} as const;

const webCapabilities: LucaCapabilities = {
  ...sharedUiCapabilities,
  desktopRuntime: false,
  electronIpc: false,
  localModelScan: false,
  localOllamaInstall: false,
  localFilesystemMemory: false,
  nativeDeviceControl: false,
  nativeLucaLinkHostControl: false,
};

const desktopCapabilities: LucaCapabilities = {
  ...sharedUiCapabilities,
  desktopRuntime: true,
  electronIpc: true,
  localModelScan: true,
  localOllamaInstall: true,
  localFilesystemMemory: true,
  nativeDeviceControl: true,
  nativeLucaLinkHostControl: true,
};

const mobileCapabilities: LucaCapabilities = {
  ...sharedUiCapabilities,
  desktopRuntime: false,
  electronIpc: false,
  localModelScan: false,
  localOllamaInstall: false,
  localFilesystemMemory: false,
  nativeDeviceControl: false,
  nativeLucaLinkHostControl: false,
};

export const lucaCapabilities: Readonly<LucaCapabilities> = Object.freeze(
  isDesktop
    ? desktopCapabilities
    : isMobile
      ? mobileCapabilities
      : webCapabilities,
);
