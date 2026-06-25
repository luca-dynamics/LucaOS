import { describe, expect, it } from "vitest";
import {
  getLucaOnboardingDisclosure,
  isLucaOnboardingAdvancedTier,
} from "./lucaOnboardingDisclosure";
import { getPremiumOnboardingCopy } from "./onboardingPremiumCopy";

const routeOptions = getPremiumOnboardingCopy("basic").screens.intelligence_route.options;
const environmentOptions = getPremiumOnboardingCopy("basic").screens.environment.options;

describe("lucaOnboardingDisclosure", () => {
  it("treats pro and creator as advanced tiers, basic as not", () => {
    expect(isLucaOnboardingAdvancedTier("basic")).toBe(false);
    expect(isLucaOnboardingAdvancedTier("pro")).toBe(true);
    expect(isLucaOnboardingAdvancedTier("creator")).toBe(true);
  });

  it("partitions advanced-flagged options out of the primary spine", () => {
    const disclosure = getLucaOnboardingDisclosure("basic", routeOptions);
    expect(disclosure.primaryOptions.map((o) => o.id)).toEqual([
      "luca_prime",
      "cloud_provider",
    ]);
    expect(disclosure.advancedOptions.map((o) => o.id)).toEqual([
      "local_model",
      "bring_your_own_key",
    ]);
    expect(disclosure.advancedShownByDefault).toBe(false);
  });

  it("shows advanced options by default for pro/creator", () => {
    expect(getLucaOnboardingDisclosure("pro", routeOptions).advancedShownByDefault).toBe(true);
    expect(getLucaOnboardingDisclosure("creator", routeOptions).advancedShownByDefault).toBe(true);
  });

  it("preserves option order and handles a no-advanced / undefined option set", () => {
    const noAdvanced = getLucaOnboardingDisclosure("basic", environmentOptions);
    expect(noAdvanced.advancedOptions).toEqual([]);
    expect(noAdvanced.primaryOptions.map((o) => o.id)).toEqual([
      "pearl",
      "carbon",
      "flow",
      "canvas",
    ]);

    const empty = getLucaOnboardingDisclosure("pro", undefined);
    expect(empty.primaryOptions).toEqual([]);
    expect(empty.advancedOptions).toEqual([]);
  });
});
