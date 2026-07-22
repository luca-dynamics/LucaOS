import { describe, expect, it } from "vitest";
import {
  getLucaOnboardingPremiumPreferences,
  mapLucaOnboardingFlowToDesktopCompletion,
  mapLucaOnboardingFlowToWebProfile,
} from "./lucaOnboardingCompletionBridge";
import {
  createLucaOnboardingFlowState,
  lucaOnboardingFlowSetOption,
} from "./lucaOnboardingFlowEngine";

describe("lucaOnboardingCompletionBridge", () => {
  it("maps the seeded defaults to a valid web profile", () => {
    const { profile } = mapLucaOnboardingFlowToWebProfile(
      createLucaOnboardingFlowState(),
    );
    // presence default is minichat -> chat; route default luca_prime -> cloud.
    expect(profile.interaction).toBe("chat");
    expect(profile.modelRoute).toBe("cloud");
    // Skin/theme is not force-mapped; name is not captured yet.
    expect(profile.theme).toBe("PROFESSIONAL");
    expect(profile.name).toBe("");
    expect(profile.personality).toBe("proactive");
    expect(profile.backgroundOpacity).toBe(30);
    expect(profile.backgroundBlur).toBe(40);
  });

  it("maps voice presence and provider routes onto the legacy fields", () => {
    let flow = createLucaOnboardingFlowState();
    flow = lucaOnboardingFlowSetOption(flow, "presence", "voice");
    flow = lucaOnboardingFlowSetOption(flow, "intelligence_route", "bring_your_own_key");
    const { profile } = mapLucaOnboardingFlowToWebProfile(flow);
    expect(profile.interaction).toBe("voice");
    expect(profile.modelRoute).toBe("byok");

    let local = createLucaOnboardingFlowState();
    local = lucaOnboardingFlowSetOption(local, "intelligence_route", "local_model");
    expect(mapLucaOnboardingFlowToWebProfile(local).profile.modelRoute).toBe(
      "desktop-later",
    );

    let cloud = createLucaOnboardingFlowState();
    cloud = lucaOnboardingFlowSetOption(cloud, "intelligence_route", "cloud_provider");
    expect(mapLucaOnboardingFlowToWebProfile(cloud).profile.modelRoute).toBe("cloud");
  });

  it("never drops a premium selection — all are returned as premiumPreferences", () => {
    let flow = createLucaOnboardingFlowState();
    flow = lucaOnboardingFlowSetOption(flow, "environment", "dark");
    flow = lucaOnboardingFlowSetOption(flow, "permission_style", "ask_every_time");
    flow = lucaOnboardingFlowSetOption(flow, "memory_boundaries", "ask_before_anything");
    flow = lucaOnboardingFlowSetOption(flow, "connect_tools", "connect_now");

    const prefs = getLucaOnboardingPremiumPreferences(flow);
    expect(prefs).toEqual({
      environment: "dark",
      presence: "minichat",
      permissionStyle: "ask_every_time",
      memoryBoundaries: "ask_before_anything",
      connectTools: "connect_now",
      intelligenceRoute: "luca_prime",
      connectors: [],
      // The recommended startup surface is active by default.
      startupSurfaces: ["minichat"],
    });

    // The same preferences ride along the web completion result.
    expect(mapLucaOnboardingFlowToWebProfile(flow).premiumPreferences).toEqual(prefs);
  });

  it("maps the desktop completion (setup flag + preferred mode + preferences)", () => {
    let flow = createLucaOnboardingFlowState();
    flow = lucaOnboardingFlowSetOption(flow, "presence", "voice");
    const desktop = mapLucaOnboardingFlowToDesktopCompletion(flow);
    expect(desktop.setupComplete).toBe(true);
    expect(desktop.preferredMode).toBe("voice");
    expect(desktop.premiumPreferences.presence).toBe("voice");

    const textMode = mapLucaOnboardingFlowToDesktopCompletion(
      createLucaOnboardingFlowState(),
    );
    expect(textMode.preferredMode).toBe("text");
  });
});
