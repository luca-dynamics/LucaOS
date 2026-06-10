import { describe, expect, it } from "vitest";
import { resolveBrowserSafeBootState } from "./browserSafeBootResolver";
import { resolveWebAccessPolicy } from "./webAccessPolicy";

describe("browserSafeBootResolver", () => {
  it("resolves browser-safe web boot without desktop runtime readiness", () => {
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

  it("does not bypass desktop readiness when web env is partial or policy is not browser-safe", () => {
    const policy = resolveWebAccessPolicy({
      releaseTarget: "web",
    });

    const state = resolveBrowserSafeBootState(policy, {
      releaseTarget: "web",
      runtimeTarget: "vercel",
    });

    expect(policy.shouldRenderBrowserSafeApp).toBe(false);
    expect(state.bootResolved).toBe(false);
    expect(state.skippedDesktopChecks).toBe(false);
  });

  it("reports unavailable capabilities as desktop-required, pairing-required, api-required, or permissioned", () => {
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
    expect(state.readiness.actions).toBe("permissioned");
  });
});
