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
    expect(isPublicWebQueryModeBlocked("widget", policy)).toBe(false);
  });

  it("defaults explicit web/vercel mode to the unauthenticated public shell", () => {
    const policy = resolveWebAccessPolicy({
      releaseTarget: "web",
      runtimeTarget: "vercel",
    });

    expect(policy.runtimeState).toBe("web-preview");
    expect(policy.shouldRenderPublicShell).toBe(true);
  });

  it.each(["widget", "chat", "hologram", "mobile", "tv"])(
    "blocks ?mode=%s from bypassing the public web shell",
    (mode) => {
      const policy = resolveWebAccessPolicy({
        releaseTarget: "web",
        runtimeTarget: "vercel",
      });

      expect(isPublicWebQueryModeBlocked(mode, policy)).toBe(true);
    },
  );

  it("requires a future authenticated session and public API before allowing the full web app", () => {
    const policy = resolveWebAccessPolicy({
      releaseTarget: "web",
      runtimeTarget: "vercel",
      apiUrl: "https://api.lucaos.space",
      hasAuthenticatedSession: true,
    });

    expect(policy.runtimeState).toBe("authenticated-web-app");
    expect(policy.shouldRenderPublicShell).toBe(false);
  });

  it("does not treat localhost as a valid public API boundary", () => {
    const policy = resolveWebAccessPolicy({
      releaseTarget: "web",
      runtimeTarget: "vercel",
      apiUrl: "http://127.0.0.1:3002",
      hasAuthenticatedSession: true,
    });

    expect(policy.runtimeState).toBe("web-preview");
    expect(policy.shouldRenderPublicShell).toBe(true);
  });
});
