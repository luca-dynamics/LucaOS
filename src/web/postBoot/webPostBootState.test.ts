import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WEB_ONBOARDING_KEY,
  WEB_PROFILE_KEY,
  type WebProfile,
} from "../webLifecycleStorage";
import { resolveWebPostBootState } from "./webPostBootState";

const values = new Map<string, string>();

function installBrowser(permission: PermissionState = "prompt") {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
    },
  });
  vi.stubGlobal("navigator", {
    permissions: {
      query: vi.fn().mockResolvedValue({ state: permission }),
    },
  });
}

function storeProfile(overrides: Partial<WebProfile> = {}) {
  values.set(WEB_ONBOARDING_KEY, "true");
  values.set(
    WEB_PROFILE_KEY,
    JSON.stringify({
      name: "Maya",
      interaction: "chat",
      theme: "PROFESSIONAL",
      modelRoute: "cloud",
      personality: "proactive",
      backgroundOpacity: 0.3,
      backgroundBlur: 40,
      ...overrides,
    }),
  );
}

afterEach(() => {
  values.clear();
  vi.unstubAllGlobals();
});

describe("resolveWebPostBootState", () => {
  it("identifies a genuinely new user", async () => {
    installBrowser();
    await expect(resolveWebPostBootState()).resolves.toMatchObject({
      userState: "new_user",
      hasCompletedOnboarding: false,
      canEnterShell: false,
    });
  });

  it("allows a returning user to resume without onboarding", async () => {
    installBrowser();
    storeProfile();
    await expect(resolveWebPostBootState()).resolves.toMatchObject({
      userState: "returning_user",
      displayName: "Maya",
      preferredInteraction: "text",
      canEnterShell: true,
    });
  });

  it("holds incomplete persisted setup for attention", async () => {
    installBrowser();
    values.set(
      WEB_PROFILE_KEY,
      JSON.stringify({ name: "Maya", interaction: "chat" }),
    );
    await expect(resolveWebPostBootState()).resolves.toMatchObject({
      userState: "partial_setup",
      canEnterShell: false,
    });
  });

  it("flags denied microphone permission for a voice user", async () => {
    installBrowser("denied");
    storeProfile({ interaction: "voice" });
    await expect(resolveWebPostBootState()).resolves.toMatchObject({
      userState: "permission_attention",
      needsVoicePermission: true,
      canEnterShell: false,
    });
  });
});
