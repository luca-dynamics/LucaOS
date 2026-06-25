const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const appSource = readFileSync("src/App.tsx", "utf8");

describe("desktop premium onboarding live mount (P6)", () => {
  it("gates the premium flow behind the opt-in flag", () => {
    expect(appSource).toContain("isPremiumOnboardingEnabled()");
    expect(appSource).toContain("<LucaPremiumOnboardingPreview");
  });

  it("keeps the legacy OnboardingFlow as the default (flag off) path", () => {
    expect(appSource).toContain("isPremiumOnboardingEnabled() ? (");
    expect(appSource).toContain("<OnboardingFlow");
    expect(appSource).toContain("runtime={desktopOnboardingRuntime}");
  });

  it("bridges premium completion into settings + boot without dropping preferences", () => {
    expect(appSource).toContain("mapLucaOnboardingFlowToDesktopCompletion");
    expect(appSource).toContain("premiumOnboardingPreferences: premiumPreferences");
    expect(appSource).toContain('setBootSequence("READY")');
  });
});
