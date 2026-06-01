import { describe, expect, it } from "vitest";
import { getThemeColors } from "./themeColors";
import {
  lucaThemeAuditHardcodedColorRiskLabels,
  lucaThemeAuditPremiumAlignmentLabels,
  lucaThemeSystemAuditMap,
  lucaThemeSystemAuditNote,
  lucaThemeSystemAuditSurfaceIds,
  lucaThemeSystemCurrentDefaultsAudit,
  lucaThemeSystemHighRiskSurfaceIds,
  lucaThemeSystemPremiumTokenDirection,
} from "./lucaThemeSystemAuditMap";

const requiredSurfaceIds = [
  "theme-palette-persona-config",
  "dynamic-contrast-engine",
  "tailwind-rq-extension",
  "app-css-variable-injection",
  "settings-persona-appearance",
  "boot-visual-shell",
  "liquid-background",
  "onboarding-theme-selection",
  "onboarding-hologram-face",
  "desktop-shell-panels",
  "mobile-shell-navigation",
  "hologram-widget",
  "mini-chat-widget",
  "voice-hud-vision-hud",
  "visual-core-luca-screen",
  "browser-overlay-panels",
];

describe("lucaThemeSystemAuditMap", () => {
  it("maps every required audit target surface", () => {
    expect(lucaThemeSystemAuditSurfaceIds).toEqual(requiredSurfaceIds);
  });

  it("assigns an assessment and future recommendation to every audited surface", () => {
    for (const entry of lucaThemeSystemAuditMap) {
      expect(entry.currentThemeUsage, entry.surfaceId).toBeTruthy();
      expect(entry.tokenUsage, entry.surfaceId).toBeTruthy();
      expect(entry.visualRole, entry.surfaceId).toBeTruthy();
      expect(entry.accessibilityContrastRisk, entry.surfaceId).toBeTruthy();
      expect(entry.premiumAlignment, entry.surfaceId).toBeTruthy();
      expect(entry.futureRecommendation, entry.surfaceId).toBeTruthy();
    }
  });

  it("classifies hardcoded color risks with supported labels", () => {
    const supportedRiskLabels = new Set(lucaThemeAuditHardcodedColorRiskLabels);

    for (const entry of lucaThemeSystemAuditMap) {
      expect(
        entry.hardcodedColorRiskLabels.length,
        entry.surfaceId,
      ).toBeGreaterThan(0);
      for (const riskLabel of entry.hardcodedColorRiskLabels) {
        expect(
          supportedRiskLabels.has(riskLabel),
          `${entry.surfaceId}:${riskLabel}`,
        ).toBe(true);
      }
    }
  });

  it("uses supported premium alignment labels", () => {
    const supportedPremiumLabels = new Set(
      lucaThemeAuditPremiumAlignmentLabels,
    );

    for (const entry of lucaThemeSystemAuditMap) {
      expect(
        supportedPremiumLabels.has(entry.premiumAlignment),
        `${entry.surfaceId}:${entry.premiumAlignment}`,
      ).toBe(true);
    }
  });

  it("records premium token categories for the future architecture", () => {
    expect(lucaThemeSystemPremiumTokenDirection).toEqual(
      expect.arrayContaining([
        "appearanceMode",
        "productTheme",
        "accent",
        "backgroundBase",
        "surfaceGlass",
        "borderSubtle",
        "textPrimary",
        "shadowGlow",
        "reducedTransparency",
        "highContrast",
      ]),
    );
  });

  it("documents current defaults without changing runtime theme fallback", () => {
    expect(lucaThemeSystemCurrentDefaultsAudit).toMatchObject({
      defaultPersona: "ASSISTANT",
      defaultTheme: "PROFESSIONAL",
      defaultBackgroundOpacity: 0.3,
      defaultBackgroundBlur: 40,
      syncThemeWithPersonaDefault: true,
      behaviorChangeInThisPr: false,
    });
    expect(getThemeColors().themeName).toBe("professional");
  });

  it("identifies high-risk surfaces for staged migration", () => {
    expect(lucaThemeSystemHighRiskSurfaceIds).toEqual(
      expect.arrayContaining([
        "desktop-shell-panels",
        "mobile-shell-navigation",
        "browser-overlay-panels",
      ]),
    );
    expect(lucaThemeSystemAuditNote).toContain("audit map only");
  });
});
