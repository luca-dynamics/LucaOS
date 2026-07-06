const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const settingsModalSource = readFileSync("src/components/SettingsModal.tsx", "utf8");
const generalTabSource = readFileSync("src/components/settings/SettingsGeneralTab.tsx", "utf8");
const appearanceTabSource = readFileSync("src/components/settings/SettingsAppearanceTab.tsx", "utf8");
const skinSectionSource = readFileSync("src/components/settings/SkinPreviewSection.tsx", "utf8");

describe("settings skin integration", () => {
  it("applies the selected LucaOS skin to the Settings modal boundary", () => {
    expect(settingsModalSource).toContain("getLucaSkinMaterialVariables");
    expect(settingsModalSource).toContain("settings.general.selectedSkinId");
    expect(settingsModalSource).toContain("style={skinMaterialVariables as React.CSSProperties}");
    expect(settingsModalSource).toContain('skinMaterialVariables["--luca-accent-primary"]');
  });

  it("keeps legacy Settings theme preview scoped to an explicit local boundary", () => {
    expect(settingsModalSource).toContain("const previewTarget = themePreviewTargetRef?.current");
    expect(settingsModalSource).not.toContain("document.documentElement");
  });

  it("keeps legacy theme selection out of the visible General settings UI", () => {
    expect(generalTabSource).not.toContain("NORMAL_LUCA_THEME_OPTIONS");
    expect(generalTabSource).not.toContain("getLucaThemeLabel");
    expect(generalTabSource).not.toContain(">Theme<");
  });

  it("hosts the skin system in the first-class Appearance tab", () => {
    expect(appearanceTabSource).toContain("<SkinPreviewSection");
    expect(generalTabSource).not.toContain("<SkinPreviewSection");
  });

  it("keeps Appearance material controls off the document root", () => {
    expect(appearanceTabSource).toContain("luca:material-preview");
    expect(appearanceTabSource).not.toContain("document.documentElement");
    expect(appearanceTabSource).not.toContain("style.setProperty");
  });

  it("presents skins as the active visual environment, not a dashboard-only preview", () => {
    expect(skinSectionSource).toContain("visual operating environment");
    expect(skinSectionSource).not.toContain("Preview only");
    expect(skinSectionSource).not.toContain("dashboard shell only");
    expect(skinSectionSource).not.toContain("not skinned yet");
  });
});
