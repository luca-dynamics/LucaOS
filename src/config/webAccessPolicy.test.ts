import { describe, expect, it } from "vitest";
import {
  isPublicWebQueryModeBlocked,
  resolveWebAccessPolicy,
} from "./webAccessPolicy";

describe("webAccessPolicy", () => {
  it("leaves local desktop/dev mode unchanged", () => {
    const policy = resolveWebAccessPolicy({});

    expect(policy.runtimeState).toBe("local-desktop-dev");
    expect(policy.shouldRenderPublicShell).toBe(false);
    expect(policy.shouldRenderBrowserSafeApp).toBe(false);
    expect(isPublicWebQueryModeBlocked("widget", policy)).toBe(false);
  });

  it("renders the browser-safe main LucaOS app interface for explicit web/vercel mode", () => {
    const policy = resolveWebAccessPolicy({
      releaseTarget: "web",
      runtimeTarget: "vercel",
    });

    expect(policy.runtimeState).toBe("web-preview");
    expect(policy.shouldRenderPublicShell).toBe(false);
    expect(policy.shouldRenderBrowserSafeApp).toBe(true);
  });

  it.each(["widget", "chat", "hologram", "mobile", "tv"])(
    "blocks ?mode=%s from bypassing the browser-safe web interface",
    (mode) => {
      const policy = resolveWebAccessPolicy({
        releaseTarget: "web",
        runtimeTarget: "vercel",
      });

      expect(isPublicWebQueryModeBlocked(mode, policy)).toBe(true);
    },
  );

  it("keeps the public shell for partial/misconfigured public web state", () => {
    const policy = resolveWebAccessPolicy({
      releaseTarget: "web",
    });

    expect(policy.runtimeState).toBe("unavailable-misconfigured");
    expect(policy.shouldRenderPublicShell).toBe(true);
    expect(policy.shouldRenderBrowserSafeApp).toBe(false);
  });

  it("allows a future authenticated session and public API through the same browser-safe app path", () => {
    const policy = resolveWebAccessPolicy({
      releaseTarget: "web",
      runtimeTarget: "vercel",
      apiUrl: "https://api.lucaos.space",
      hasAuthenticatedSession: true,
    });

    expect(policy.runtimeState).toBe("authenticated-web-app");
    expect(policy.shouldRenderPublicShell).toBe(false);
    expect(policy.shouldRenderBrowserSafeApp).toBe(true);
    expect(isPublicWebQueryModeBlocked("hologram", policy)).toBe(true);
  });

  it("does not treat localhost as a valid public API boundary", () => {
    const policy = resolveWebAccessPolicy({
      releaseTarget: "web",
      runtimeTarget: "vercel",
      apiUrl: "http://127.0.0.1:3002",
      hasAuthenticatedSession: true,
    });

    expect(policy.runtimeState).toBe("web-preview");
    expect(policy.shouldRenderPublicShell).toBe(false);
    expect(policy.shouldRenderBrowserSafeApp).toBe(true);
  });
});
