import { describe, expect, it } from "vitest";

import {
  resolveLucaPlatformBackgroundPolicy,
  lucaDesktopWebSafeLiquidBackdropStyle,
  lucaDesktopWebSafeRootBackgroundStyle,
} from "./lucaPlatformBackgroundPolicy";

const serialize = (value: unknown) => JSON.stringify(value);

describe("lucaPlatformBackgroundPolicy", () => {
  it("resolves mobile web viewports to the stable mobile system background policy", () => {
    const policy = resolveLucaPlatformBackgroundPolicy({
      isMobileViewport: true,
      isNativeMobile: false,
      isDesktopNative: false,
    });

    expect(policy.mode).toBe("mobile-web");
    expect(policy.shouldRenderLiquidBackground).toBe(false);
    expect(policy.shouldUseMobileStableBackground).toBe(true);
    expect(policy.transparencyMaterialBehavior).toBe("stable-system-surface");
    expect(policy.canUseNativeWindowMaterial).toBe(false);
  });

  it("resolves native mobile to the same stable mobile system background policy", () => {
    const policy = resolveLucaPlatformBackgroundPolicy({
      isMobileViewport: false,
      isNativeMobile: true,
      isDesktopNative: false,
    });

    expect(policy.mode).toBe("mobile-native");
    expect(policy.shouldRenderLiquidBackground).toBe(false);
    expect(policy.shouldUseMobileStableBackground).toBe(true);
    expect(policy.transparencyMaterialBehavior).toBe("stable-system-surface");
  });

  it("resolves desktop web to an internal LiquidBackground with browser-safe material", () => {
    const policy = resolveLucaPlatformBackgroundPolicy({
      isMobileViewport: false,
      isNativeMobile: false,
      isDesktopNative: false,
    });

    expect(policy.mode).toBe("desktop-web");
    expect(policy.shouldRenderLiquidBackground).toBe(true);
    expect(policy.shouldUseMobileStableBackground).toBe(false);
    expect(policy.transparencyMaterialBehavior).toBe("internal-page-material");
    expect(policy.usesBrowserSafeLiquidFallback).toBe(true);
  });

  it("does not claim native window material capability for desktop web", () => {
    const policy = resolveLucaPlatformBackgroundPolicy({
      isMobileViewport: false,
      isNativeMobile: false,
      isDesktopNative: false,
    });

    expect(policy.canUseNativeWindowMaterial).toBe(false);
    expect(policy.transparencyMaterialBehavior).not.toBe("native-window-material");
  });

  it("resolves Electron/native desktop to the native-window-material-capable policy", () => {
    const policy = resolveLucaPlatformBackgroundPolicy({
      isMobileViewport: false,
      isNativeMobile: false,
      isDesktopNative: true,
    });

    expect(policy.mode).toBe("desktop-native");
    expect(policy.shouldRenderLiquidBackground).toBe(true);
    expect(policy.transparencyMaterialBehavior).toBe("native-window-material");
    expect(policy.canUseNativeWindowMaterial).toBe(true);
  });

  it("keeps mobile policy away from liquid wallpaper tokens as the dominant background", () => {
    const policy = resolveLucaPlatformBackgroundPolicy({
      isMobileViewport: true,
      isNativeMobile: false,
      isDesktopNative: false,
    });

    expect(serialize(policy.rootApplicationStyle)).toContain("--luca-background-base");
    expect(serialize(policy.rootApplicationStyle)).not.toContain("--luca-background-liquid");
    expect(serialize(policy.backdropStyle)).not.toContain("--luca-background-liquid");
  });

  it("gives desktop web solid Luca fallback tokens behind internal liquid", () => {
    const browserSafePolicy = serialize({
      root: lucaDesktopWebSafeRootBackgroundStyle,
      liquid: lucaDesktopWebSafeLiquidBackdropStyle,
    });

    expect(browserSafePolicy).toContain("--luca-background-base");
    expect(browserSafePolicy).toContain("--luca-background-elevated");
    expect(browserSafePolicy).toContain("--luca-background-liquid");
  });
});
