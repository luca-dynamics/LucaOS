const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const lifecycleSource = readFileSync("src/web/WebLifecycleShell.tsx", "utf8");

describe("web premium onboarding live mount (P7 — default path)", () => {
  it("mounts premium onboarding unconditionally for the onboarding state", () => {
    expect(lifecycleSource).toContain("<LucaPremiumOnboardingPreview");
    expect(lifecycleSource).toContain('lifecycleState === "onboarding"');
    expect(lifecycleSource).not.toContain("isPremiumOnboardingEnabled");
    expect(lifecycleSource).not.toContain("<OnboardingFlow");
  });

  it("bridges premium completion into the existing storage + routing", () => {
    expect(lifecycleSource).toContain("mapLucaOnboardingFlowToWebProfile");
    expect(lifecycleSource).toContain("completeWebOnboarding(profile)");
    expect(lifecycleSource).toContain("writeWebPremiumPreferences(premiumPreferences)");
    expect(lifecycleSource).toContain(
      'setLifecycleState(showWebReadyDebug ? "ready" : "main")',
    );
  });
});
