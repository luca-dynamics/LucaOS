export type LucaWebRuntimeState =
  | "local-desktop-dev"
  | "web-preview"
  | "authenticated-web-app"
  | "unavailable-misconfigured";

export type LucaPublicQueryMode =
  | "widget"
  | "chat"
  | "hologram"
  | "mobile"
  | "tv";

export interface WebAccessSignals {
  releaseTarget?: string;
  runtimeTarget?: string;
  appMode?: string;
  apiUrl?: string;
  hostname?: string;
  hasAuthenticatedSession?: boolean;
  isElectronRuntime?: boolean;
}

export interface WebAccessPolicy {
  runtimeState: LucaWebRuntimeState;
  isExplicitWebVercelTarget: boolean;
  hasConfiguredPublicApi: boolean;
  hasAuthenticatedSession: boolean;
  shouldRenderPublicShell: boolean;
  shouldRenderBrowserSafeApp: boolean;
  blockedQueryModes: readonly LucaPublicQueryMode[];
  reason: string;
}

export const PUBLIC_WEB_BLOCKED_QUERY_MODES: readonly LucaPublicQueryMode[] = [
  "widget",
  "chat",
  "hologram",
  "mobile",
  "tv",
] as const;

const LOCALHOST_PATTERN =
  /^(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|::1)(?::\d+)?$/i;

const normalize = (value?: string): string => (value ?? "").trim();

const isLocalhostUrl = (value: string): boolean => {
  if (!value) return false;

  try {
    const url = new URL(value);
    return (
      LOCALHOST_PATTERN.test(url.host) ||
      LOCALHOST_PATTERN.test(url.hostname)
    );
  } catch {
    return LOCALHOST_PATTERN.test(value.replace(/^https?:\/\//i, ""));
  }
};

const hasPublicApiUrl = (apiUrl?: string): boolean => {
  const normalizedApiUrl = normalize(apiUrl);
  return normalizedApiUrl !== "" && !isLocalhostUrl(normalizedApiUrl);
};

export const resolveWebAccessPolicy = (
  signals: WebAccessSignals = {},
): WebAccessPolicy => {
  const releaseTarget = normalize(signals.releaseTarget);
  const runtimeTarget = normalize(signals.runtimeTarget);
  const appMode = normalize(signals.appMode);
  const hostname = normalize(signals.hostname).toLowerCase();
  const isWebRelease = releaseTarget === "web";
  const isVercelRuntime = runtimeTarget === "vercel";
  const isWebAppMode = appMode === "web";
  const isPublicBrowserDeploymentHost =
    hostname.endsWith(".vercel.app") ||
    hostname.includes("vercel.app") ||
    hostname === "app.lucaos.space" ||
    hostname.endsWith(".app.lucaos.space");
  const isElectronRuntime = signals.isElectronRuntime === true;
  const isExplicitWebVercelTarget = isWebRelease && isVercelRuntime;
  const isReliableWebPreviewSignal =
    isExplicitWebVercelTarget ||
    isWebRelease ||
    isVercelRuntime ||
    isWebAppMode ||
    isPublicBrowserDeploymentHost;
  const hasConfiguredPublicApi = hasPublicApiUrl(signals.apiUrl);
  const hasAuthenticatedSession = signals.hasAuthenticatedSession === true;

  // Browser-safe web rendering is intentionally robust for deployed previews:
  // explicit Vite web env, web app mode, Vercel runtime, or a public preview
  // hostname can activate it, but Electron/native desktop is always excluded so
  // desktop boot readiness stays strict.
  if (!isReliableWebPreviewSignal || isElectronRuntime) {
    return {
      runtimeState: "local-desktop-dev",
      isExplicitWebVercelTarget,
      hasConfiguredPublicApi,
      hasAuthenticatedSession,
      shouldRenderPublicShell: false,
      shouldRenderBrowserSafeApp: false,
      blockedQueryModes: [],
      reason: isElectronRuntime
        ? "Electron/native desktop runtime is excluded from browser-safe web preview boot."
        : "Local desktop/dev runtime is outside the public web preview gate.",
    };
  }

  if (hasAuthenticatedSession && hasConfiguredPublicApi) {
    return {
      runtimeState: "authenticated-web-app",
      isExplicitWebVercelTarget,
      hasConfiguredPublicApi,
      hasAuthenticatedSession,
      shouldRenderPublicShell: false,
      shouldRenderBrowserSafeApp: true,
      blockedQueryModes: PUBLIC_WEB_BLOCKED_QUERY_MODES,
      reason:
        "A future authenticated API/session boundary is present for the public web app.",
    };
  }

  return {
    runtimeState: "web-preview",
    isExplicitWebVercelTarget,
    hasConfiguredPublicApi,
    hasAuthenticatedSession,
    shouldRenderPublicShell: false,
    shouldRenderBrowserSafeApp: true,
    blockedQueryModes: PUBLIC_WEB_BLOCKED_QUERY_MODES,
    reason: isExplicitWebVercelTarget
      ? "Public web/vercel mode renders the browser-safe LucaOS interface shell; runtime actions remain disabled until API/auth/session is implemented."
      : "Browser-safe web preview inferred from web app mode, Vercel runtime, or public deployment hostname; runtime actions remain disabled until API/auth/session is implemented.",
  };
};

const readViteEnv = (key: string): string => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const value = import.meta.env[key];
    return typeof value === "string" ? value : "";
  }

  return "";
};

export const readCurrentWebAccessPolicy = (
  overrides: Partial<WebAccessSignals> = {},
): WebAccessPolicy =>
  resolveWebAccessPolicy({
    releaseTarget: readViteEnv("VITE_LUCA_RELEASE_TARGET"),
    runtimeTarget: readViteEnv("VITE_LUCA_RUNTIME_TARGET"),
    appMode: readViteEnv("VITE_LUCA_APP_MODE"),
    apiUrl: readViteEnv("VITE_LUCA_API_URL"),
    hostname: typeof window !== "undefined" ? window.location.hostname : "",
    hasAuthenticatedSession: false,
    isElectronRuntime:
      typeof window !== "undefined" &&
      Boolean(
        (window as any).electron ||
          (window as any).ipcRenderer ||
          (window as any).process?.versions?.electron ||
          window.navigator.userAgent.toLowerCase().includes("electron"),
      ),
    ...overrides,
  });

export const shouldRenderPublicWebShell = (policy: WebAccessPolicy): boolean =>
  policy.shouldRenderPublicShell;

export const isPublicWebQueryModeBlocked = (
  mode: string | null,
  policy: WebAccessPolicy,
): boolean =>
  (policy.shouldRenderPublicShell || policy.shouldRenderBrowserSafeApp) &&
  policy.blockedQueryModes.includes(mode as LucaPublicQueryMode);
