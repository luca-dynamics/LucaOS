const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const settingsModalSource = readFileSync("src/components/SettingsModal.tsx", "utf8");
const generalTabSource = readFileSync("src/components/settings/SettingsGeneralTab.tsx", "utf8");
const skinSectionSource = readFileSync("src/components/settings/SkinPreviewSection.tsx", "utf8");

describe("settings skin integration", () => {
  it("applies the selected LucaOS skin to the Settings modal boundary", () => {
    expect(settingsModalSource).toContain("getLucaSkinMaterialVariables");
    expect(settingsModalSource).toContain("settings.general.selectedSkinId");
    expect(settingsModalSource).toContain("style={skinMaterialVariables as React.CSSProperties}");
    expect(settingsModalSource).toContain('skinMaterialVariables["--luca-accent-primary"]');
  });

  it("keeps legacy theme selection out of the visible General settings UI", () => {
    expect(generalTabSource).not.toContain("NORMAL_LUCA_THEME_OPTIONS");
    expect(generalTabSource).not.toContain("getLucaThemeLabel");
    expect(generalTabSource).not.toContain(">Theme<");
    expect(generalTabSource).toContain("<SkinPreviewSection");
  });

  it("presents skins as the active visual environment, not a dashboard-only preview", () => {
    expect(skinSectionSource).toContain("visual operating environment");
    expect(skinSectionSource).not.toContain("Preview only");
    expect(skinSectionSource).not.toContain("dashboard shell only");
    expect(skinSectionSource).not.toContain("not skinned yet");
  });
});
