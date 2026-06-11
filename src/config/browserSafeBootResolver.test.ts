import { describe, expect, it } from "vitest";
import {
  resolveBrowserSafeBootState,
  shouldShowBootShell,
} from "./browserSafeBootResolver";
import { resolveWebAccessPolicy } from "./webAccessPolicy";

describe("browserSafeBootResolver", () => {
  it("resolves browser-safe web boot with Vite web/vercel env without desktop runtime readiness", () => {
    const policy = resolveWebAccessPolicy({
      releaseTarget: "web",
      runtimeTarget: "vercel",
    });

    const state = resolveBrowserSafeBootState(policy, {
      releaseTarget: "web",
      runtimeTarget: "vercel",
    });

    expect(state.bootResolved).toBe(true);
    expect(state.shellRenderEligible).toBe(true);
    expect(state.runtimeMode).toBe("browser-safe-web");
    expect(state.skippedDesktopChecks).toBe(true);
    expect(state.readiness.webSurface).toBe("ready");
    expect(state.readiness.desktopRuntime).toBe("desktop-required");
  });

  it("activates for a deployed browser hostname when env is missing, but not in Electron", () => {
    const browserPolicy = resolveWebAccessPolicy({
      hostname: "app.lucaos.space",
    });
    const browserState = resolveBrowserSafeBootState(browserPolicy, {
      hostname: "app.lucaos.space",
    });

    expect(browserPolicy.shouldRenderBrowserSafeApp).toBe(true);
    expect(browserState.bootResolved).toBe(true);

    const electronPolicy = resolveWebAccessPolicy({
      releaseTarget: "web",
      runtimeTarget: "vercel",
      hostname: "luca-preview.vercel.app",
      isElectronRuntime: true,
    });
    const electronState = resolveBrowserSafeBootState(electronPolicy, {
      releaseTarget: "web",
      runtimeTarget: "vercel",
      hostname: "luca-preview.vercel.app",
      isElectronRuntime: true,
    });

    expect(electronPolicy.shouldRenderBrowserSafeApp).toBe(false);
    expect(electronState.bootResolved).toBe(false);
    expect(electronState.skippedDesktopChecks).toBe(false);
  });

  it("does not wait on Electron, native, Cortex, localhost, or Ollama readiness in web mode", () => {
    const policy = resolveWebAccessPolicy({
      releaseTarget: "web",
      runtimeTarget: "vercel",
    });

    const state = resolveBrowserSafeBootState(policy, {
      releaseTarget: "web",
      runtimeTarget: "vercel",
    });

    expect(state.readiness.nativeRuntime).toBe("desktop-required");
    expect(state.readiness.localhostPolling).toBe("skipped");
    expect(state.readiness.cortex).toBe("desktop-required");
    expect(state.readiness.ollama).toBe("desktop-required");
    expect(state.readiness.localModels).toBe("desktop-required");
    expect(state.readiness.actions).toBe("disabled_in_web");
  });

  it("configures a short web-only visual duration and safety timeout", () => {
    const policy = resolveWebAccessPolicy({
      releaseTarget: "web",
      runtimeTarget: "vercel",
    });

    const state = resolveBrowserSafeBootState(policy, {
      releaseTarget: "web",
      runtimeTarget: "vercel",
    });

    expect(state.minVisualDurationMs).toBeGreaterThanOrEqual(900);
    expect(state.minVisualDurationMs).toBeLessThanOrEqual(1800);
    expect(state.fallbackTimeoutMs).toBe(2000);
  });

  it("does not use the browser-safe bypass for desktop/local mode", () => {
    const policy = resolveWebAccessPolicy({});

    const state = resolveBrowserSafeBootState(policy, {});

    expect(state.bootResolved).toBe(false);
    expect(state.shellRenderEligible).toBe(false);
    expect(state.runtimeMode).toBe("desktop-native-or-local");
    expect(state.skippedDesktopChecks).toBe(false);
    expect(state.fallbackTimeoutMs).toBe(0);
  });

  it("activates for partial web env so Vercel env drift cannot trap boot", () => {
    const policy = resolveWebAccessPolicy({
      releaseTarget: "web",
    });

    const state = resolveBrowserSafeBootState(policy, {
      releaseTarget: "web",
    });

    expect(policy.shouldRenderBrowserSafeApp).toBe(true);
    expect(state.bootResolved).toBe(true);
    expect(state.skippedDesktopChecks).toBe(true);
  });

  it("prioritizes browser-safe shell rendering after fallback even when desktop/runtime readiness is false", () => {
    expect(
      shouldShowBootShell({
        bootSequence: "INIT",
        showBootShell: false,
        browserSafeBootResolved: true,
      }),
    ).toBe(false);

    expect(
      shouldShowBootShell({
        bootSequence: "INIT",
        showBootShell: false,
        browserSafeBootResolved: false,
      }),
    ).toBe(true);
  });

  it("keeps the debug query path on the same browser-safe resolver", () => {
    const policy = resolveWebAccessPolicy({
      hostname: "preview-291.vercel.app",
    });
    const state = resolveBrowserSafeBootState(policy, {
      hostname: "preview-291.vercel.app",
    });

    expect(state.bootResolved).toBe(true);
    expect(state.fallbackTimeoutMs).toBe(2000);
  });

  it("reports unavailable capabilities as desktop-required, pairing-required, api-required, or disabled", () => {
    const policy = resolveWebAccessPolicy({
      releaseTarget: "web",
      runtimeTarget: "vercel",
    });

    const state = resolveBrowserSafeBootState(policy, {
      releaseTarget: "web",
      runtimeTarget: "vercel",
    });

    expect(state.readiness.lucaLink).toBe("pairing-required");
    expect(state.readiness.personalIntelligence).toBe("api-required");
    expect(state.readiness.actions).toBe("disabled_in_web");
  });
});
