// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  WEB_PREMIUM_PREFERENCES_KEY,
  WEB_PROFILE_KEY,
  readWebPremiumPreferences,
  writeWebPremiumPreferences,
} from "./webLifecycleStorage";

afterEach(() => {
  window.localStorage.clear();
});

describe("web premium preferences storage (P3)", () => {
  it("returns null when nothing is stored", () => {
    expect(readWebPremiumPreferences()).toBeNull();
  });

  it("round-trips the premium preference block under its own key", () => {
    writeWebPremiumPreferences({
      environment: "carbon",
      presence: "voice",
      permissionStyle: "ask_every_time",
      memoryBoundaries: "ask_before_anything",
      connectTools: "connect_now",
      intelligenceRoute: "bring_your_own_key",
    });

    expect(readWebPremiumPreferences()).toEqual({
      environment: "carbon",
      presence: "voice",
      permissionStyle: "ask_every_time",
      memoryBoundaries: "ask_before_anything",
      connectTools: "connect_now",
      intelligenceRoute: "bring_your_own_key",
    });
    // It uses its own key and does not write the legacy profile.
    expect(window.localStorage.getItem(WEB_PREMIUM_PREFERENCES_KEY)).not.toBeNull();
    expect(window.localStorage.getItem(WEB_PROFILE_KEY)).toBeNull();
  });

  it("sanitizes non-string and unknown fields on read and write", () => {
    window.localStorage.setItem(
      WEB_PREMIUM_PREFERENCES_KEY,
      JSON.stringify({ environment: "flow", presence: 42, bogus: "x" }),
    );
    expect(readWebPremiumPreferences()).toEqual({ environment: "flow" });
  });

  it("tolerates malformed JSON", () => {
    window.localStorage.setItem(WEB_PREMIUM_PREFERENCES_KEY, "{not json");
    expect(readWebPremiumPreferences()).toBeNull();
  });
});
