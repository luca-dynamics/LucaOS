import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { premiumOnboardingScreenOrder } from "./onboardingPremiumCopy";
import {
  getPremiumOnboardingDefaultSelections,
  getPremiumOnboardingNextScreen,
  getPremiumOnboardingPreviousScreen,
  getPremiumOnboardingScreenEntry,
  getPremiumOnboardingScreenMap,
  premiumOnboardingScreenMapOrder,
  type PremiumOnboardingRuntimeEffect,
} from "./onboardingPremiumScreenMap";

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

const boundaryTextFor = (screenId: (typeof expectedScreenOrder)[number]) =>
  getPremiumOnboardingScreenEntry(screenId).sideEffectBoundary.join(" ").toLowerCase();

describe("premium onboarding screen map", () => {
  it("covers all screens and matches the copy model order", () => {
    const screenMap = getPremiumOnboardingScreenMap();

    expect(premiumOnboardingScreenMapOrder).toEqual(expectedScreenOrder);
    expect(premiumOnboardingScreenMapOrder).toEqual(premiumOnboardingScreenOrder);
    expect(Object.keys(screenMap)).toEqual(expectedScreenOrder);

    const orderValues = premiumOnboardingScreenMapOrder.map((screenId) => screenMap[screenId].order);
    expect(new Set(orderValues).size).toBe(orderValues.length);

    for (const [index, screenId] of expectedScreenOrder.entries()) {
      expect(screenMap[screenId].id).toBe(screenId);
      expect(screenMap[screenId].copyScreenId).toBe(screenId);
      expect(screenMap[screenId].order).toBe(index);
    }
  });

  it("navigates between mapped screens without changing routing", () => {
    expect(getPremiumOnboardingPreviousScreen("welcome")).toBeUndefined();
    expect(getPremiumOnboardingNextScreen("welcome")).toBe("environment");
    expect(getPremiumOnboardingPreviousScreen("environment")).toBe("welcome");
    expect(getPremiumOnboardingNextScreen("finish")).toBeUndefined();
    expect(getPremiumOnboardingPreviousScreen("finish")).toBe("intelligence_route");
  });

  it("returns typed default selections without storage writes", () => {
    expect(getPremiumOnboardingDefaultSelections()).toEqual({
      environment: "carbon",
      presence: "minichat",
      permission_style: "ask_when_needed",
      memory_boundaries: "ask_before_personal",
      connect_tools: "set_up_later",
      intelligence_route: "luca_prime",
    });
  });

  it("keeps side effects deferred until finish", () => {
    const allowedNonFinishEffects: PremiumOnboardingRuntimeEffect[] = ["none", "deferred_preference_only"];

    for (const screenId of expectedScreenOrder) {
      const entry = getPremiumOnboardingScreenEntry(screenId);

      if (screenId === "finish") {
        expect(entry.runtimeEffect).toBe("finish_only");
      } else {
        expect(allowedNonFinishEffects).toContain(entry.runtimeEffect);
        expect(entry.runtimeEffect).not.toBe("finish_only");
      }
    }
  });

  it("documents side-effect boundaries for sensitive systems", () => {
    expect(boundaryTextFor("environment")).toContain("no skin boundary");
    expect(boundaryTextFor("environment")).toContain("no semantic-status color changes");

    expect(boundaryTextFor("presence")).toContain("no microphone");
    expect(boundaryTextFor("presence")).toContain("no voice listener");

    expect(boundaryTextFor("permission_style")).toContain("no governance bypass");

    expect(boundaryTextFor("memory_boundaries")).toContain("no memory engine mutation");

    expect(boundaryTextFor("connect_tools")).toContain("no browser automation");
    expect(boundaryTextFor("connect_tools")).toContain("no file-app permissions");
    expect(boundaryTextFor("connect_tools")).toContain("no secure vault writes");

    expect(boundaryTextFor("intelligence_route")).toContain("no provider routing");
    expect(boundaryTextFor("intelligence_route")).toContain("no local model start");
    expect(boundaryTextFor("intelligence_route")).toContain("no key storage");

    expect(boundaryTextFor("finish")).toContain("completion only after explicit enter lucaos");
  });

  it("sets explicit consent gates only where future choices require them", () => {
    expect(getPremiumOnboardingScreenEntry("permission_style").requiresExplicitConsent).toBe(true);
    expect(getPremiumOnboardingScreenEntry("memory_boundaries").requiresExplicitConsent).toBe(true);
    expect(getPremiumOnboardingScreenEntry("connect_tools").requiresExplicitConsent).toBe(true);
    expect(getPremiumOnboardingScreenEntry("intelligence_route").requiresExplicitConsent).toBe(true);
    expect(getPremiumOnboardingScreenEntry("finish").requiresExplicitConsent).toBe(true);
    expect(getPremiumOnboardingScreenEntry("environment").requiresExplicitConsent).toBe(false);
    expect(getPremiumOnboardingScreenEntry("presence").requiresExplicitConsent).toBe(false);
  });

  it("defines skip and back behavior without replacing onboarding", () => {
    expect(getPremiumOnboardingScreenEntry("welcome").canGoBack).toBe(false);
    expect(getPremiumOnboardingScreenEntry("finish").canSkip).toBe(false);
    expect(getPremiumOnboardingScreenEntry("permission_style").canSkip).toBe(false);
    expect(getPremiumOnboardingScreenEntry("memory_boundaries").canSkip).toBe(false);
    expect(getPremiumOnboardingScreenEntry("welcome").canSkip).toBe(true);
    expect(getPremiumOnboardingScreenEntry("environment").canSkip).toBe(true);
    expect(getPremiumOnboardingScreenEntry("presence").canSkip).toBe(true);
    expect(getPremiumOnboardingScreenEntry("connect_tools").canSkip).toBe(true);
    expect(getPremiumOnboardingScreenEntry("intelligence_route").canSkip).toBe(true);
  });

  it("does not import runtime systems or mutate DOM/storage", () => {
    const sourcePath = fileURLToPath(new URL("./onboardingPremiumScreenMap.ts", import.meta.url));
    const source = fs.readFileSync(sourcePath, "utf8");
    const importSources = [...source.matchAll(/^import\s+(?:type\s+)?[\s\S]*?\sfrom\s+"([^"]+)";/gm)].map(
      (match) => match[1],
    );

    expect(importSources.every((source) => source === "./onboardingPremiumCopy")).toBe(true);

    const forbiddenRuntimeImportTerms = [
      "OnboardingFlow",
      "OnboardingController",
      "OnboardingRuntimeAdapter",
      "secureVault",
      "Web Safe Mode",
      "provider hub",
      "model routing",
      "memory service",
      "voice runtime",
    ];

    for (const term of forbiddenRuntimeImportTerms) {
      expect(source.match(/import[\s\S]*?from "[^"]+";/g)?.join("\n") ?? "").not.toContain(term);
    }

    const forbiddenMutationTerms = [
      "document.documentElement",
      "style.setProperty",
      "document.body",
      "window.localStorage",
      "localStorage",
    ];

    for (const term of forbiddenMutationTerms) {
      expect(source).not.toContain(term);
    }
  });
});
