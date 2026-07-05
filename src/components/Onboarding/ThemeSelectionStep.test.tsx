import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ThemeSelectionStep from "./ThemeSelectionStep";
import { LUCA_SKIN_IDS, LUCA_SKINS } from "../../config/lucaSkins";
import { getLucaSkinPreviewMetadata } from "../../config/lucaSkinPreviewMetadata";

const { readFileSync } = process.getBuiltinModule("node:fs");

const source = readFileSync("src/components/Onboarding/ThemeSelectionStep.tsx", "utf8");
const webRuntimeSource = readFileSync("src/web/adapters/webOnboardingRuntime.tsx", "utf8");

const renderedSkinSelection = (showTransparencyControls = false) =>
  renderToStaticMarkup(
    <ThemeSelectionStep
      onComplete={() => {}}
      onSkinChange={() => {}}
      initialSkinId="carbon"
      showTransparencyControls={showTransparencyControls}
    />,
  );

describe("ThemeSelectionStep Luca skin selection", () => {
  it("renders every skin from the shared Luca skin registry", () => {
    const html = renderedSkinSelection();

    expect(html).toContain("Choose Luca&#x27;s environment");
    expect(html).toContain("Pick the skin LucaOS will use across the app");
    for (const skinId of LUCA_SKIN_IDS) {
      const metadata = getLucaSkinPreviewMetadata(skinId);
      expect(html).toContain(metadata.shortLabel);
      expect(html).toContain(metadata.tagline);
    }
  });

  it("uses Carbon as the default shared skin", () => {
    expect(LUCA_SKINS.carbon.recommendedDefault).toBe(true);
    expect(renderedSkinSelection()).toContain("Default");
  });

  it("uses Settings material wording and controls for opacity and blur", () => {
    const html = renderedSkinSelection(true);

    expect(html).toContain("Background material");
    expect(html).toContain("same material controls as Settings");
    expect(html).toContain("Opacity");
    expect(html).toContain("Blur");
    expect(html).not.toContain("Adjust UI Transparency");
  });

  it("does not mutate root html for live previews", () => {
    expect(source).not.toContain("document.documentElement");
    expect(source).toContain("getLucaSkinMaterialVariables");
    expect(source).toContain("selectedSkinId");
  });

  it("keeps WebBridge onboarding on the shared skin display path", () => {
    expect(webRuntimeSource).toContain("selectedSkinId");
    expect(source).not.toContain("NORMAL_LUCA_THEME_OPTIONS");
    expect(source).not.toContain("theme protocol");
  });
});
