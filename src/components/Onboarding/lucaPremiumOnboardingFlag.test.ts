import { describe, expect, it } from "vitest";
import {
  isPremiumOnboardingEnabled,
  LUCA_PREMIUM_ONBOARDING_QUERY_FLAG,
} from "./lucaPremiumOnboardingFlag";

describe("isPremiumOnboardingEnabled", () => {
  it("is off by default and only on for the explicit flag value", () => {
    expect(isPremiumOnboardingEnabled("")).toBe(false);
    expect(isPremiumOnboardingEnabled("?foo=bar")).toBe(false);
    expect(isPremiumOnboardingEnabled("?premiumOnboarding=0")).toBe(false);
    expect(isPremiumOnboardingEnabled("?premiumOnboarding=1")).toBe(true);
    expect(isPremiumOnboardingEnabled("?a=b&premiumOnboarding=1")).toBe(true);
  });

  it("exposes the query flag name", () => {
    expect(LUCA_PREMIUM_ONBOARDING_QUERY_FLAG).toBe("premiumOnboarding");
  });
});
