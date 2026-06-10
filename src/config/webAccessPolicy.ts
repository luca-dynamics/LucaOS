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
  apiUrl?: string;
  hostname?: string;
  hasAuthenticatedSession?: boolean;
}

export interface WebAccessPolicy {
  runtimeState: LucaWebRuntimeState;
  isExplicitWebVercelTarget: boolean;
  hasConfiguredPublicApi: boolean;
  hasAuthenticatedSession: boolean;
  shouldRenderPublicShell: boolean;
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
  const isWebRelease = releaseTarget === "web";
  const isVercelRuntime = runtimeTarget === "vercel";
  const isExplicitWebVercelTarget = isWebRelease && isVercelRuntime;
  const isPartialWebTarget = isWebRelease || isVercelRuntime;
  const hasConfiguredPublicApi = hasPublicApiUrl(signals.apiUrl);
  const hasAuthenticatedSession = signals.hasAuthenticatedSession === true;

  if (!isPartialWebTarget) {
    return {
      runtimeState: "local-desktop-dev",
      isExplicitWebVercelTarget,
      hasConfiguredPublicApi,
      hasAuthenticatedSession,
      shouldRenderPublicShell: false,
      blockedQueryModes: [],
      reason: "Local desktop/dev runtime is outside the public web preview gate.",
    };
  }

  if (!isExplicitWebVercelTarget) {
    return {
      runtimeState: "unavailable-misconfigured",
      isExplicitWebVercelTarget,
      hasConfiguredPublicApi,
      hasAuthenticatedSession,
      shouldRenderPublicShell: true,
      blockedQueryModes: PUBLIC_WEB_BLOCKED_QUERY_MODES,
      reason:
        "Public web mode requires both VITE_LUCA_RELEASE_TARGET=web and VITE_LUCA_RUNTIME_TARGET=vercel.",
    };
  }

  if (hasAuthenticatedSession && hasConfiguredPublicApi) {
    return {
      runtimeState: "authenticated-web-app",
      isExplicitWebVercelTarget,
      hasConfiguredPublicApi,
      hasAuthenticatedSession,
      shouldRenderPublicShell: false,
      blockedQueryModes: [],
      reason:
        "A future authenticated API/session boundary is present for the public web app.",
    };
  }

  return {
    runtimeState: "web-preview",
    isExplicitWebVercelTarget,
    hasConfiguredPublicApi,
    hasAuthenticatedSession,
    shouldRenderPublicShell: true,
    blockedQueryModes: PUBLIC_WEB_BLOCKED_QUERY_MODES,
    reason:
      "Public web/vercel mode defaults to the safe unauthenticated preview shell until API/auth/session is implemented.",
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
    apiUrl: readViteEnv("VITE_LUCA_API_URL"),
    hostname: typeof window !== "undefined" ? window.location.hostname : "",
    hasAuthenticatedSession: false,
    ...overrides,
  });

export const shouldRenderPublicWebShell = (policy: WebAccessPolicy): boolean =>
  policy.shouldRenderPublicShell;

export const isPublicWebQueryModeBlocked = (
  mode: string | null,
  policy: WebAccessPolicy,
): boolean =>
  policy.shouldRenderPublicShell &&
  PUBLIC_WEB_BLOCKED_QUERY_MODES.includes(mode as LucaPublicQueryMode);
