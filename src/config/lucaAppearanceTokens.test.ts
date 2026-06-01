import { describe, expect, it } from "vitest";
import {
  LUCA_APPEARANCE_DEFAULTS,
  buildLucaAppearanceCssVariables,
  getLucaAppearanceCssVariables,
  resolveLucaAppearanceTokens,
  type LucaAppearanceTokens,
} from "./lucaAppearanceTokens";

const requiredTokenKeys: Array<keyof LucaAppearanceTokens> = [
  "appearanceMode",
  "requestedAppearanceMode",
  "productTheme",
  "accent",
  "backgroundOpacity",
  "backgroundBlur",
  "backgroundBase",
  "backgroundElevated",
  "backgroundLiquid",
  "surfaceGlass",
  "surfaceSolid",
  "surfaceHover",
  "borderSubtle",
  "borderStrong",
  "textPrimary",
  "textSecondary",
  "textTertiary",
  "accentPrimary",
  "accentSoft",
  "danger",
  "success",
  "warning",
  "info",
  "shadowSoft",
  "shadowGlow",
  "blurLevel",
  "motionStyle",
  "reducedMotion",
  "reducedTransparency",
  "highContrast",
];

describe("resolveLucaAppearanceTokens", () => {
  it("returns a complete semantic premium token set without requiring new settings", () => {
    const tokens = resolveLucaAppearanceTokens();

    for (const key of requiredTokenKeys) {
      expect(tokens[key], key).not.toBeUndefined();
    }

    expect(tokens.productTheme).toBe("luca-silver");
    expect(tokens.backgroundOpacity).toBe(LUCA_APPEARANCE_DEFAULTS.defaultBackgroundOpacity);
    expect(tokens.backgroundBlur).toBe(LUCA_APPEARANCE_DEFAULTS.defaultBackgroundBlur);
  });

  it("resolves luca-silver as a light premium neutral surface system", () => {
    const tokens = resolveLucaAppearanceTokens({
      productTheme: "luca-silver",
      appearanceMode: "light",
      accent: "neutral",
    });

    expect(tokens.appearanceMode).toBe("light");
    expect(tokens.backgroundBase).toMatch(/#f6f7f9|#fff/i);
    expect(tokens.textPrimary).toBe("#161a20");
    expect(tokens.borderSubtle).toContain("rgba");
    expect(tokens.accent).toBe("neutral");
  });

  it("resolves luca-graphite as a dark premium neutral surface system", () => {
    const tokens = resolveLucaAppearanceTokens({
      productTheme: "luca-graphite",
      appearanceMode: "dark",
      accent: "neutral",
    });

    expect(tokens.appearanceMode).toBe("dark");
    expect(tokens.backgroundBase).toBe("#101215");
    expect(tokens.surfaceSolid).toBe("#1b1e23");
    expect(tokens.textPrimary).toBe("#f4f6f8");
    expect(tokens.backgroundLiquid).not.toContain("#4fbf7a");
  });

  it("maps legacy PROFESSIONAL safely to the premium silver direction", () => {
    const tokens = resolveLucaAppearanceTokens({ theme: "PROFESSIONAL", persona: "ASSISTANT" });

    expect(tokens.productTheme).toBe("luca-silver");
    expect(tokens.accent).toBe("neutral");
    expect(tokens.appearanceMode).toBe("light");
  });

  it("maps legacy MASTER_SYSTEM to a restrained blue accent without electric-blue-dominant surfaces", () => {
    const tokens = resolveLucaAppearanceTokens({ theme: "MASTER_SYSTEM" });

    expect(tokens.productTheme).toBe("luca-graphite");
    expect(tokens.accent).toBe("blue");
    expect(tokens.accentPrimary).toBe("#4f8cff");
    expect(tokens.surfaceGlass).not.toContain("#4f8cff");
    expect(tokens.backgroundBase).toBe("#101215");
  });

  it("maps legacy TERMINAL to a restrained green accent without green terminal surfaces", () => {
    const tokens = resolveLucaAppearanceTokens({ theme: "TERMINAL" });

    expect(tokens.productTheme).toBe("luca-graphite");
    expect(tokens.accent).toBe("green");
    expect(tokens.accentPrimary).toBe("#4fbf7a");
    expect(tokens.surfaceGlass).not.toContain("#4fbf7a");
    expect(tokens.backgroundLiquid).not.toContain("#4fbf7a");
  });

  it("preserves and normalizes opacity and blur as first-class material inputs", () => {
    const tokens = resolveLucaAppearanceTokens({
      theme: "LIGHTCREAM",
      backgroundOpacity: 1.4,
      backgroundBlur: 180,
    });

    expect(tokens.backgroundOpacity).toBe(1);
    expect(tokens.backgroundBlur).toBe(120);
    expect(tokens.blurLevel).toBe("120px");
    expect(tokens.surfaceGlass).toContain("rgba");

    const tuned = resolveLucaAppearanceTokens({ backgroundOpacity: 0.42, backgroundBlur: 24 });
    expect(tuned.backgroundOpacity).toBe(0.42);
    expect(tuned.backgroundBlur).toBe(24);
    expect(tuned.blurLevel).toBe("24px");
  });

  it("documents old defaults as unchanged and avoids a Settings schema migration", () => {
    expect(LUCA_APPEARANCE_DEFAULTS).toMatchObject({
      defaultPersona: "ASSISTANT",
      defaultTheme: "PROFESSIONAL",
      defaultBackgroundOpacity: 0.3,
      defaultBackgroundBlur: 40,
      syncThemeWithPersonaDefault: true,
      settingsSchemaMigrationRequired: false,
    });
  });

  it("generates additive CSS variables for both legacy app variables and semantic luca variables", () => {
    const variables = buildLucaAppearanceCssVariables({
      theme: "PROFESSIONAL",
      backgroundOpacity: 0.33,
      backgroundBlur: 44,
    });

    expect(variables["--app-bg-opacity"]).toBe("0.33");
    expect(variables["--app-bg-blur"]).toBe("44px");
    expect(variables["--app-text-main"]).toBeTruthy();
    expect(variables["--luca-background-base"]).toBeTruthy();
    expect(variables["--luca-surface-glass"]).toBeTruthy();
    expect(variables["--luca-shadow-glow"]).toBeTruthy();
  });

  it("exposes token-only variables consumable by boot and liquid without new runtime state", () => {
    const tokens = resolveLucaAppearanceTokens({ theme: "MASTER_SYSTEM" });
    const variables = getLucaAppearanceCssVariables(tokens);

    expect(variables["--luca-surface-glass"]).toBe(tokens.surfaceGlass);
    expect(variables["--luca-border-subtle"]).toBe(tokens.borderSubtle);
    expect(variables["--luca-background-liquid"]).toBe(tokens.backgroundLiquid);
    expect(variables["--luca-accent-soft"]).toBe(tokens.accentSoft);
    expect(Object.keys(variables).some((name) => name.includes("boot"))).toBe(false);
  });
});
