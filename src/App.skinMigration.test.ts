const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const appSource = readFileSync("src/App.tsx", "utf8");

describe("App skin migration bridge", () => {
  it("backs the legacy theme object with the selected LucaOS skin", () => {
    const themeBridgeStart = appSource.indexOf("const getThemeColors = useCallback");

    expect(themeBridgeStart).toBeGreaterThan(-1);
    expect(appSource.indexOf("getLucaSkinDefinition(selectedSkinId)", themeBridgeStart)).toBeGreaterThan(themeBridgeStart);
    expect(appSource.indexOf("getLucaSkinMaterialVariables({", themeBridgeStart)).toBeGreaterThan(themeBridgeStart);
    expect(appSource.indexOf('skinMaterialVariables["--luca-accent-primary"]', themeBridgeStart)).toBeGreaterThan(themeBridgeStart);
    expect(appSource.indexOf("themeName: skinDefinition.id", themeBridgeStart)).toBeGreaterThan(themeBridgeStart);
    expect(appSource).toContain("[isLockdown, activeThemeId, systemStatus, selectedSkinId, isMobile]");
  });

  it("applies selected skin variables to app-wide compatibility tokens", () => {
    expect(appSource).toContain('skinMaterialVariables["--luca-text-primary"]');
    expect(appSource).toContain('skinMaterialVariables["--luca-background-base"]');
    expect(appSource).toContain('"--app-primary": skinMaterialVariables["--luca-accent-primary"]');
    expect(appSource).toContain('"--app-theme-type": skinIsLight ? "light" : "dark"');
  });

  it("uses the skin background during web background sync", () => {
    const backgroundSyncStart = appSource.indexOf("// --- WEB BACKGROUND SYNC ---");

    expect(backgroundSyncStart).toBeGreaterThan(-1);
    expect(appSource.indexOf("getLucaSkinMaterialVariables({", backgroundSyncStart)).toBeGreaterThan(backgroundSyncStart);
    expect(appSource.indexOf('skinMaterialVariables["--luca-background-base"]', backgroundSyncStart)).toBeGreaterThan(backgroundSyncStart);
    expect(appSource.indexOf("[selectedSkinId, isMobile]", backgroundSyncStart)).toBeGreaterThan(backgroundSyncStart);
  });
});
