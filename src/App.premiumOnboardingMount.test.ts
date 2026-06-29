const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const appSource = readFileSync("src/App.tsx", "utf8");

describe("desktop premium onboarding live mount (P6)", () => {
  it("mounts the premium onboarding flow directly", () => {
    expect(appSource).toContain("<LucaPremiumOnboardingPreview");
  });

  it("passes desktop local-model context into premium onboarding", () => {
    expect(appSource).toContain("supportsLocalProvisioning={isElectron}");
    expect(appSource).toContain("localEndpointStatus={localEndpointStatus}");
    expect(appSource).toContain("systemRamBytes={systemRamBytes}");
  });

  it("bridges premium completion into settings + boot without dropping preferences", () => {
    expect(appSource).toContain("mapLucaOnboardingFlowToDesktopCompletion");
    expect(appSource).toContain("premiumOnboardingPreferences: premiumPreferences");
    expect(appSource).toContain('setBootSequence("READY")');
  });

  it("keeps dashboard skin hooks before the boot/onboarding early return", () => {
    const dashboardSkinIndex = appSource.indexOf("const dashboardSkinBoundary = useMemo(");
    const mobileSkinIndex = appSource.indexOf("const mobileSkinBoundary = useMemo(");
    const bootReturnIndex = appSource.indexOf("shouldShowBootShell({");

    expect(dashboardSkinIndex).toBeGreaterThan(-1);
    expect(mobileSkinIndex).toBeGreaterThan(-1);
    expect(bootReturnIndex).toBeGreaterThan(-1);
    expect(dashboardSkinIndex).toBeLessThan(bootReturnIndex);
    expect(mobileSkinIndex).toBeLessThan(bootReturnIndex);
  });
});
