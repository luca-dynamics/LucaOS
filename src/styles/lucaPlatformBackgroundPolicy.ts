import type { CSSProperties } from "react";

import { lucaMobileAppBackgroundStyle } from "./lucaMobileShellStyles";

export type LucaPlatformBackgroundMode =
  | "desktop-native"
  | "desktop-web"
  | "mobile-native"
  | "mobile-web";

export type LucaTransparencyMaterialBehavior =
  | "native-window-material"
  | "internal-page-material"
  | "stable-system-surface";

export interface LucaPlatformBackgroundSignals {
  isMobileViewport: boolean;
  isNativeMobile: boolean;
  isDesktopNative: boolean;
}

export interface LucaPlatformBackgroundPolicy {
  mode: LucaPlatformBackgroundMode;
  shouldRenderLiquidBackground: boolean;
  shouldUseMobileStableBackground: boolean;
  transparencyMaterialBehavior: LucaTransparencyMaterialBehavior;
  /**
   * True means this runtime can participate in native window material if the
   * host window is separately configured for transparency/glass. It does not
   * mean native OS transparency is already enabled.
   */
  canUseNativeWindowMaterial: boolean;
  usesBrowserSafeLiquidFallback: boolean;
  rootApplicationStyle: CSSProperties;
  backdropStyle: CSSProperties;
}

const DESKTOP_WEB_BROWSER_SAFE_BACKGROUND =
  "var(--luca-background-base, var(--app-bg-main, #f4f1e8))";

const DESKTOP_WEB_BROWSER_SAFE_BACKDROP =
  "var(--luca-background-liquid, var(--luca-background-elevated, var(--luca-background-base, var(--app-bg-main, #f4f1e8))))";

const DESKTOP_NATIVE_READY_BACKGROUND = "transparent";

export const lucaDesktopWebSafeRootBackgroundStyle: CSSProperties = {
  background: DESKTOP_WEB_BROWSER_SAFE_BACKGROUND,
  color: "var(--luca-text-primary, var(--app-text-main))",
};

export const lucaDesktopWebSafeLiquidBackdropStyle: CSSProperties = {
  background: DESKTOP_WEB_BROWSER_SAFE_BACKDROP,
};

export const lucaDesktopNativeTransparentRootStyle: CSSProperties = {
  background: DESKTOP_NATIVE_READY_BACKGROUND,
};

/**
 * Resolves the shell background contract for the current runtime.
 *
 * Desktop web cannot show the user's desktop wallpaper behind a browser tab, so
 * its opacity and blur are internal webpage material effects over solid Luca
 * fallback tokens. Native desktop may later map those same material controls to
 * a transparent OS window only when the host window is configured for it. Mobile
 * app and mobile web keep PR #175's stable white/dark graphite system surface.
 */
export function resolveLucaPlatformBackgroundPolicy({
  isMobileViewport,
  isNativeMobile,
  isDesktopNative,
}: LucaPlatformBackgroundSignals): LucaPlatformBackgroundPolicy {
  if (isMobileViewport || isNativeMobile) {
    return {
      mode: isNativeMobile ? "mobile-native" : "mobile-web",
      shouldRenderLiquidBackground: false,
      shouldUseMobileStableBackground: true,
      transparencyMaterialBehavior: "stable-system-surface",
      canUseNativeWindowMaterial: false,
      usesBrowserSafeLiquidFallback: false,
      rootApplicationStyle: lucaMobileAppBackgroundStyle,
      backdropStyle: lucaMobileAppBackgroundStyle,
    };
  }

  if (isDesktopNative) {
    return {
      mode: "desktop-native",
      shouldRenderLiquidBackground: true,
      shouldUseMobileStableBackground: false,
      transparencyMaterialBehavior: "native-window-material",
      canUseNativeWindowMaterial: true,
      usesBrowserSafeLiquidFallback: false,
      rootApplicationStyle: lucaDesktopNativeTransparentRootStyle,
      backdropStyle: lucaDesktopNativeTransparentRootStyle,
    };
  }

  return {
    mode: "desktop-web",
    shouldRenderLiquidBackground: true,
    shouldUseMobileStableBackground: false,
    transparencyMaterialBehavior: "internal-page-material",
    canUseNativeWindowMaterial: false,
    usesBrowserSafeLiquidFallback: true,
    rootApplicationStyle: lucaDesktopWebSafeRootBackgroundStyle,
    backdropStyle: lucaDesktopWebSafeLiquidBackdropStyle,
  };
}
