import type { WebAccessPolicy, WebAccessSignals } from "./webAccessPolicy";

export const BROWSER_SAFE_BOOT_MIN_DURATION_MS = 1200;
export const BROWSER_SAFE_BOOT_FALLBACK_TIMEOUT_MS = 2000;

export type BrowserSafeBootRuntimeMode =
  | "browser-safe-web"
  | "desktop-native-or-local";

export type BrowserSafeBootReadinessStatus =
  | "ready"
  | "skipped"
  | "unavailable"
  | "desktop-required"
  | "pairing-required"
  | "api-required"
  | "permissioned";

export interface BrowserSafeBootReadiness {
  webSurface: BrowserSafeBootReadinessStatus;
  desktopRuntime: BrowserSafeBootReadinessStatus;
  nativeRuntime: BrowserSafeBootReadinessStatus;
  localhostPolling: BrowserSafeBootReadinessStatus;
  cortex: BrowserSafeBootReadinessStatus;
  ollama: BrowserSafeBootReadinessStatus;
  lucaLink: BrowserSafeBootReadinessStatus;
  localModels: BrowserSafeBootReadinessStatus;
  personalIntelligence: BrowserSafeBootReadinessStatus;
  actions: BrowserSafeBootReadinessStatus;
}

export interface BrowserSafeBootState {
  bootResolved: boolean;
  shellRenderEligible: boolean;
  runtimeMode: BrowserSafeBootRuntimeMode;
  skippedDesktopChecks: boolean;
  minVisualDurationMs: number;
  fallbackTimeoutMs: number;
  readiness: BrowserSafeBootReadiness;
  reason: string;
}

const normalize = (value?: string): string => (value ?? "").trim();

export const resolveBrowserSafeBootState = (
  policy: WebAccessPolicy,
  env: Pick<WebAccessSignals, "releaseTarget" | "runtimeTarget"> = {},
): BrowserSafeBootState => {
  const envIsExplicitWebVercelTarget =
    normalize(env.releaseTarget) === "web" &&
    normalize(env.runtimeTarget) === "vercel";

  const shouldResolveBrowserSafeBoot =
    envIsExplicitWebVercelTarget &&
    policy.isExplicitWebVercelTarget &&
    policy.shouldRenderBrowserSafeApp === true;

  if (!shouldResolveBrowserSafeBoot) {
    return {
      bootResolved: false,
      shellRenderEligible: false,
      runtimeMode: "desktop-native-or-local",
      skippedDesktopChecks: false,
      minVisualDurationMs: 0,
      fallbackTimeoutMs: 0,
      readiness: {
        webSurface: "unavailable",
        desktopRuntime: "ready",
        nativeRuntime: "ready",
        localhostPolling: "ready",
        cortex: "ready",
        ollama: "ready",
        lucaLink: "permissioned",
        localModels: "ready",
        personalIntelligence: "permissioned",
        actions: "permissioned",
      },
      reason:
        "Browser-safe web boot resolver is inactive outside explicit web/Vercel app rendering.",
    };
  }

  return {
    bootResolved: true,
    shellRenderEligible: true,
    runtimeMode: "browser-safe-web",
    skippedDesktopChecks: true,
    minVisualDurationMs: BROWSER_SAFE_BOOT_MIN_DURATION_MS,
    fallbackTimeoutMs: BROWSER_SAFE_BOOT_FALLBACK_TIMEOUT_MS,
    readiness: {
      webSurface: "ready",
      desktopRuntime: "desktop-required",
      nativeRuntime: "desktop-required",
      localhostPolling: "skipped",
      cortex: "desktop-required",
      ollama: "desktop-required",
      lucaLink: "pairing-required",
      localModels: "desktop-required",
      personalIntelligence: "api-required",
      actions: "permissioned",
    },
    reason:
      "Explicit web/Vercel policy resolved browser-safe boot; desktop, native, localhost, Cortex, and Ollama readiness are skipped for web shell rendering only.",
  };
};
