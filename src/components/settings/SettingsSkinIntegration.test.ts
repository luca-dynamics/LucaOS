const { readFileSync } = process.getBuiltinModule("node:fs");
import { describe, expect, it } from "vitest";

const settingsModalSource = readFileSync("src/components/SettingsModal.tsx", "utf8");
const generalTabSource = readFileSync("src/components/settings/SettingsGeneralTab.tsx", "utf8");
const appearanceTabSource = readFileSync("src/components/settings/SettingsAppearanceTab.tsx", "utf8");
const skinSectionSource = readFileSync("src/components/settings/SkinPreviewSection.tsx", "utf8");
const lucaDialogSource = readFileSync("src/components/ui/luca/LucaDialog.tsx", "utf8");

describe("settings skin integration", () => {
  it("applies the selected LucaOS skin to the Settings modal boundary", () => {
    expect(settingsModalSource).toContain("getLucaSkinMaterialVariables");
    expect(settingsModalSource).toContain("settings.general.selectedSkinId");
    // The boundary style became a spread when the Codex skin variables and the
    // modal layer style joined it (2afdeb22); the pinned literal was never
    // updated. The skin variables still land on the dialog root first, which is
    // the guarantee this asserts.
    expect(settingsModalSource).toContain(
      "style={{ ...skinMaterialVariables, ...settingsCodexSkinVariables,",
    );
    expect(settingsModalSource).toContain('skinMaterialVariables["--luca-accent-primary"]');
    // The dialog material role moved into the LucaDialog primitive in the same
    // commit. The modal inherits it now instead of stamping it inline, so the
    // role is asserted where it actually lives.
    expect(settingsModalSource).toContain("<LucaDialog");
    expect(lucaDialogSource).toContain('data-luca-material-role="dialog"');
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
    // Wording moved to "active LucaOS visual environment" when the catalog
    // became the optional "More environments" shelf; the guarantee this test
    // guards — skins are the LIVE environment, never a dashboard preview —
    // is unchanged, as the negative assertions below still enforce.
    expect(skinSectionSource).toContain("active LucaOS visual environment");
    expect(skinSectionSource).not.toContain("Preview only");
    expect(skinSectionSource).not.toContain("dashboard shell only");
    expect(skinSectionSource).not.toContain("not skinned yet");
  });
});
