import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ThemeSelectionStep from "./ThemeSelectionStep";
import { NORMAL_LUCA_THEME_OPTIONS, getLucaThemeLabel } from "../../config/lucaThemeLabels";

const { readFileSync } = process.getBuiltinModule("node:fs");

const source = readFileSync("src/components/Onboarding/ThemeSelectionStep.tsx", "utf8");
const labelSource = readFileSync("src/config/lucaThemeLabels.ts", "utf8");
const webRuntimeSource = readFileSync("src/web/adapters/webOnboardingRuntime.tsx", "utf8");

const renderedThemeSelection = (showTransparencyControls = false) =>
  renderToStaticMarkup(
    <ThemeSelectionStep
      onComplete={() => {}}
      onThemeChange={() => {}}
      initialTheme="RUTHLESS"
      showTransparencyControls={showTransparencyControls}
    />,
  );

describe("ThemeSelectionStep premium personalization copy", () => {
  it("renders premium display labels instead of raw internal theme names", () => {
    const html = renderedThemeSelection();

    expect(html).toContain("Choose Luca’s atmosphere");
    expect(html).toContain("Set the look of your personal AI OS");
    for (const option of NORMAL_LUCA_THEME_OPTIONS) {
      expect(html).toContain(option.label);
      expect(html).toContain(option.description);
    }
    for (const rawInternalName of ["RUTHLESS", "TERMINAL", "MASTER_SYSTEM", "AGENTIC_SLATE"]) {
      expect(html).not.toContain(rawInternalName);
    }
  });

  it("preserves internal theme keys for persistence and state", () => {
    expect(getLucaThemeLabel("RUTHLESS")).toMatchObject({
      id: "RUTHLESS",
      canonicalThemeId: "MASTER_SYSTEM",
      label: "Luca Graphite",
    });
    expect(getLucaThemeLabel("TERMINAL")).toMatchObject({
      id: "TERMINAL",
      canonicalThemeId: "MASTER_SYSTEM",
    });
  });

  it("uses user-friendly names for glass and depth controls", () => {
    const html = renderedThemeSelection(true);

    expect(html).toContain("Background depth");
    expect(html).toContain("Shape the glass presence across LucaOS");
    expect(html).toContain("Glow strength");
    expect(html).toContain("Glass softness");
    expect(html).not.toContain("OPACITY");
    expect(html).not.toContain("BLUR");
    expect(html).not.toContain("Adjust UI Transparency");
  });

  it("keeps normal onboarding theme UI free of protocol setup wording", () => {
    const html = renderedThemeSelection(true).toLowerCase();
    const userFacingSource = [source, labelSource].join("\n").toLowerCase();
    const forbiddenUserFacingCopy = [
      "terminal",
      "protocol",
      "kernel",
      "operator",
      "mission control",
      "command center",
      "visual protocol",
      "theme protocol",
      "system profile",
      "interface calibration",
      "configure visual style",
    ];

    for (const forbidden of forbiddenUserFacingCopy) {
      expect(html, forbidden).not.toContain(forbidden);
    }
    for (const forbidden of ["interface calibration", "configure visual style"]) {
      expect(userFacingSource, forbidden).not.toContain(forbidden);
    }
  });

  it("keeps polished options mapped to canonical theme ids", () => {
    expect(getLucaThemeLabel("RUTHLESS").label).toBe("Luca Graphite");
    expect(NORMAL_LUCA_THEME_OPTIONS.map((option) => option.canonicalThemeId)).toEqual([
      "PROFESSIONAL",
      "MASTER_SYSTEM",
      "FROST",
      "LIGHTCREAM",
    ]);
  });

  it("keeps WebBridge onboarding on the shared theme display copy path", () => {
    expect(webRuntimeSource).not.toContain("Luca Graphite · Green Accent");
    expect(webRuntimeSource).not.toContain("theme protocol");
    expect(source).toContain("NORMAL_LUCA_THEME_OPTIONS");
  });
});
