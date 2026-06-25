const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const lifecycleSource = readFileSync("src/web/WebLifecycleShell.tsx", "utf8");

describe("web premium onboarding live mount (P4)", () => {
  it("gates the premium flow behind the opt-in flag", () => {
    expect(lifecycleSource).toContain("isPremiumOnboardingEnabled");
    expect(lifecycleSource).toContain("<LucaPremiumOnboardingPreview");
    expect(lifecycleSource).toContain(
      'lifecycleState === "onboarding" && isPremiumOnboardingEnabled()',
    );
  });

  it("keeps the legacy onboarding as the default (flag off) path", () => {
    expect(lifecycleSource).toContain(
      'lifecycleState === "onboarding" && !isPremiumOnboardingEnabled()',
    );
    expect(lifecycleSource).toContain("<OnboardingFlow");
    expect(lifecycleSource).toContain("runtime={webOnboardingRuntime}");
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
