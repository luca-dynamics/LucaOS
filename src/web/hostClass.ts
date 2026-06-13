export type WebHostClass =
  | "desktop-web"
  | "mobile-web"
  | "tablet-web"
  | "smart-tv-web"
  | "embedded-web"
  | "kiosk-web"
  | "unknown-web";

export interface BrowserHostSignals {
  userAgent?: string;
  platform?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  screenWidth?: number;
  screenHeight?: number;
  maxTouchPoints?: number;
  coarsePointer?: boolean;
  finePointer?: boolean;
  standalone?: boolean;
  kioskMode?: boolean;
  embedded?: boolean;
}

const includesAny = (value: string, candidates: string[]): boolean =>
  candidates.some((candidate) => value.includes(candidate));

export const classifyWebHost = (signals: BrowserHostSignals): WebHostClass => {
  const userAgent = (signals.userAgent ?? "").toLowerCase();
  const platform = (signals.platform ?? "").toLowerCase();
  const width = signals.viewportWidth ?? signals.screenWidth ?? 0;
  const screenWidth = signals.screenWidth ?? width;
  const touchPoints = signals.maxTouchPoints ?? 0;

  if (signals.kioskMode || includesAny(userAgent, ["kiosk", "fully kiosk"])) {
    return "kiosk-web";
  }

  if (
    signals.embedded ||
    includesAny(userAgent, ["wv)", "; wv", "webview", "embedded"])
  ) {
    return "embedded-web";
  }

  if (
    includesAny(userAgent, [
      "smart-tv",
      "smarttv",
      "hbbtv",
      "netcast",
      "viera",
      "web0s",
      "webos.tv",
      "tizen",
      "appletv",
      "googletv",
      "aftb",
      "aftm",
      "aftt",
      "roku",
    ])
  ) {
    return "smart-tv-web";
  }

  if (
    screenWidth >= 1600 &&
    signals.coarsePointer === true &&
    signals.finePointer !== true &&
    touchPoints === 0
  ) {
    return "smart-tv-web";
  }

  const isTabletUa =
    includesAny(userAgent, ["ipad", "tablet", "kindle", "silk/"]) ||
    (platform.includes("mac") && touchPoints > 1);
  if (isTabletUa || (touchPoints > 0 && width >= 600 && width < 1200)) {
    return "tablet-web";
  }

  const isMobileUa = includesAny(userAgent, [
    "iphone",
    "ipod",
    "android",
    "mobile",
    "windows phone",
  ]);
  if (isMobileUa || (touchPoints > 0 && width > 0 && width < 600)) {
    return "mobile-web";
  }

  const hasDesktopIdentity = includesAny(userAgent, [
    "windows",
    "macintosh",
    "x11",
    "linux",
    "cros",
  ]);
  if (
    hasDesktopIdentity ||
    signals.finePointer === true ||
    (width >= 900 && touchPoints === 0)
  ) {
    return "desktop-web";
  }

  return "unknown-web";
};

export const readBrowserHostSignals = (): BrowserHostSignals => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {};
  }

  const displayModeStandalone = window.matchMedia?.(
    "(display-mode: standalone)",
  ).matches;
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
    userAgentData?: { platform?: string };
  };

  return {
    userAgent: navigator.userAgent,
    platform:
      navigatorWithStandalone.userAgentData?.platform ?? navigator.platform,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    coarsePointer: window.matchMedia?.("(pointer: coarse)").matches,
    finePointer: window.matchMedia?.("(pointer: fine)").matches,
    standalone:
      displayModeStandalone || navigatorWithStandalone.standalone === true,
    kioskMode:
      new URLSearchParams(window.location.search).get("display") === "kiosk",
    embedded: window.self !== window.top,
  };
};

export const detectWebHostClass = (): WebHostClass =>
  classifyWebHost(readBrowserHostSignals());
