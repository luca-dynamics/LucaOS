import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import {
  getPremiumOnboardingCopy,
  premiumOnboardingBasicBannedTerms,
  premiumOnboardingCopy,
  premiumOnboardingScreenOrder,
  type PremiumOnboardingCopySet,
} from "./onboardingPremiumCopy";

const expectedScreenOrder = [
  "welcome",
  "environment",
  "presence",
  "permission_style",
  "memory_boundaries",
  "connect_tools",
  "intelligence_route",
  "finish",
] as const;

const copyValuesForSet = (copySet: PremiumOnboardingCopySet): string[] =>
  Object.values(copySet.screens).flatMap((screen) => [
    screen.eyebrow,
    screen.title,
    screen.summary,
    screen.reassurance,
    screen.primaryCta,
    screen.secondaryCta,
    screen.detailsLabel,
    screen.accessibilityLabel,
    ...(screen.options ?? []).flatMap((option) => [option.title, option.description]),
  ]).filter((value): value is string => Boolean(value));

const screenText = (copySet: PremiumOnboardingCopySet, screenId: (typeof expectedScreenOrder)[number]) => {
  const screen = copySet.screens[screenId];

  return [
    screen.eyebrow,
    screen.title,
    screen.summary,
    screen.reassurance,
    screen.primaryCta,
    screen.secondaryCta,
    screen.detailsLabel,
    screen.accessibilityLabel,
    ...(screen.options ?? []).flatMap((option) => [option.title, option.description]),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();
};

const allCopyText = () => Object.values(premiumOnboardingCopy).flatMap(copyValuesForSet).join(" ").toLowerCase();

describe("premium onboarding copy model", () => {
  it("covers all modes and the exact screen order", () => {
    expect(premiumOnboardingCopy.basic).toBeDefined();
    expect(premiumOnboardingCopy.pro).toBeDefined();
    expect(premiumOnboardingCopy.creator).toBeDefined();
    expect(premiumOnboardingScreenOrder).toEqual(expectedScreenOrder);

    for (const copySet of Object.values(premiumOnboardingCopy)) {
      expect(Object.keys(copySet.screens)).toEqual(expectedScreenOrder);
      for (const screenId of expectedScreenOrder) {
        expect(copySet.screens[screenId].id).toBe(screenId);
      }
    }
  });

  it("falls back to basic copy for invalid modes", () => {
    expect(getPremiumOnboardingCopy("basic")).toBe(premiumOnboardingCopy.basic);
    expect(getPremiumOnboardingCopy("unknown-mode")).toBe(premiumOnboardingCopy.basic);
  });

  it("keeps basic default copy free of banned technical language", () => {
    const basicCopy = copyValuesForSet(premiumOnboardingCopy.basic).join(" ").toLowerCase();

    for (const term of premiumOnboardingBasicBannedTerms) {
      expect(basicCopy).not.toContain(term);
    }
  });

  it("keeps rendered copy free of sensitive implementation words", () => {
    const unsafeTerms = [
      "master_key_hex",
      "luca_vault_key",
      "fallback key",
      "private key",
      "api key",
      "secret",
      "token",
    ];
    const copyText = allCopyText();

    for (const term of unsafeTerms) {
      expect(copyText).not.toContain(term);
    }
  });

  it("keeps intelligence route copy as preference-only", () => {
    const routeCopy = screenText(premiumOnboardingCopy.basic, "intelligence_route");

    expect(routeCopy).toContain("only a preference");
    expect(routeCopy).toContain("does not change providers");
    expect(routeCopy).toContain("start a local model");
    expect(routeCopy).toContain("grant a cloud connection");
    expect(routeCopy).not.toContain("provider route has changed");
    expect(routeCopy).not.toContain("local model has started");
    expect(routeCopy).not.toContain("stored");
    expect(routeCopy).not.toContain("cloud connection has been granted");
  });

  it("states permission style cannot bypass safety", () => {
    const permissionCopy = screenText(premiumOnboardingCopy.basic, "permission_style");

    expect(permissionCopy).toContain("sensitive or destructive actions always ask first");
    expect(permissionCopy).toContain("does not bypass lucaos safety checks");
  });

  it("keeps memory boundaries safe and reversible", () => {
    const memoryCopy = screenText(premiumOnboardingCopy.basic, "memory_boundaries");

    expect(memoryCopy).toContain("you can change this later");
    expect(memoryCopy).toContain("ask luca to forget");
    expect(memoryCopy).not.toContain("memory engine changed");
    expect(memoryCopy).not.toContain("deleted");
    expect(memoryCopy).not.toContain("personal details are saved automatically");
  });

  it("keeps tool connection consent-based", () => {
    const toolCopy = screenText(premiumOnboardingCopy.basic, "connect_tools");

    expect(toolCopy).toContain("no tool access starts until you review and approve it");
    expect(toolCopy).not.toContain("browser automation has started");
    expect(toolCopy).not.toContain("permissions have been granted");
    expect(toolCopy).not.toContain("tools are connected automatically");
  });

  it("keeps environment copy separate from skin behavior and safety behavior", () => {
    const environmentCopy = screenText(premiumOnboardingCopy.basic, "environment");

    expect(environmentCopy).toContain("does not change safety behavior");
    expect(environmentCopy).not.toContain("semantic colors");
    expect(environmentCopy).not.toContain("status colors");
    expect(environmentCopy).not.toContain("skin boundary");
  });

  it("does not mutate DOM, storage, or import runtime systems", () => {
    const sourcePath = fileURLToPath(new URL("./onboardingPremiumCopy.ts", import.meta.url));
    const source = fs.readFileSync(sourcePath, "utf8").toLowerCase();
    const forbiddenSourceTerms = [
      "document.documentelement",
      "style.setproperty",
      "document.body",
      "body.style",
      'document.queryselector("html")',
      "window.localstorage",
      "localstorage",
      "securevault",
      "providerhub",
      "model-router",
      "modelrouting",
      "memoryservice",
      "governance",
      "web safe mode",
      "browser automation",
      "voiceruntime",
      "lucalink",
    ];

    for (const term of forbiddenSourceTerms) {
      expect(source).not.toContain(term);
    }
  });
});
