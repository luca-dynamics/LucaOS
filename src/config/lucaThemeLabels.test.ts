import { describe, expect, it } from "vitest";
import { THEME_PALETTE } from "./themeColors";
import {
  LUCA_THEME_LABELS,
  NORMAL_LUCA_THEME_OPTIONS,
  getLucaThemeLabel,
} from "./lucaThemeLabels";
import { resolveLucaAppearanceTokens } from "./lucaAppearanceTokens";

const legacyThemeIds = [
  "MASTER_SYSTEM",
  "TERMINAL",
  "BUILDER",
  "DICTATION",
  "RUTHLESS",
  "HACKER",
  "ENGINEER",
  "ASSISTANT",
  "LUCAGENT",
  "AGENTIC_SLATE",
  "VAPORWAVE",
] as const;

const blockedProductCopy = [
  "MASTER_SYSTEM",
  "TERMINAL",
  "BUILDER",
  "DICTATION",
  "RUTHLESS",
  "HACKER",
  "ENGINEER",
  "ASSISTANT",
  "LUCAGENT",
  "AGENTIC_SLATE",
  "BIOS",
  "CLI",
  "coding environment",
] as const;

describe("lucaThemeLabels", () => {
  it("exposes only Luca Silver, Graphite, Frost, and Cream as normal theme options", () => {
    expect(NORMAL_LUCA_THEME_OPTIONS.map((option) => option.label)).toEqual([
      "Luca Silver",
      "Luca Graphite",
      "Luca Frost",
      "Luca Cream",
    ]);
    expect(NORMAL_LUCA_THEME_OPTIONS.map((option) => option.canonicalThemeId)).toEqual([
      "PROFESSIONAL",
      "MASTER_SYSTEM",
      "FROST",
      "LIGHTCREAM",
    ]);
  });

  it("does not expose duplicate compatibility aliases as normal theme cards", () => {
    const normalIds = NORMAL_LUCA_THEME_OPTIONS.map((option) => option.id);

    for (const legacyId of legacyThemeIds) {
      if (["MASTER_SYSTEM", "VAPORWAVE"].includes(legacyId)) continue;
      expect(normalIds).not.toContain(legacyId);
    }
    expect(normalIds).not.toContain("VAPORWAVE");
  });

  it("resolves legacy IDs through the product-facing label map", () => {
    expect(getLucaThemeLabel("ASSISTANT")).toMatchObject({
      label: "Luca Silver",
      canonicalThemeId: "PROFESSIONAL",
      visibility: "legacy",
    });
    expect(getLucaThemeLabel("RUTHLESS")).toMatchObject({
      label: "Luca Graphite",
      canonicalThemeId: "MASTER_SYSTEM",
      visibility: "legacy",
    });
    expect(getLucaThemeLabel("TERMINAL")).toMatchObject({
      label: "Luca Graphite · Green Accent",
      canonicalThemeId: "MASTER_SYSTEM",
      visibility: "legacy",
    });
  });

  it("keeps legacy internal theme IDs present for compatibility", () => {
    for (const legacyId of legacyThemeIds) {
      expect(THEME_PALETTE[legacyId], legacyId).toBeDefined();
      expect(LUCA_THEME_LABELS[legacyId], legacyId).toBeDefined();
    }
  });

  it("keeps normal product descriptions free of tactical and developer IDs", () => {
    const productCopy = NORMAL_LUCA_THEME_OPTIONS
      .flatMap((option) => [option.label, option.description])
      .join(" ");

    for (const blocked of blockedProductCopy) {
      expect(productCopy.toLowerCase()).not.toContain(blocked.toLowerCase());
    }
  });

  it("preserves first-run resolution and opacity/blur token behavior", () => {
    const lightTokens = resolveLucaAppearanceTokens({
      theme: undefined,
      platformAppearance: "light",
      backgroundOpacity: 0.42,
      backgroundBlur: 24,
    });
    const darkTokens = resolveLucaAppearanceTokens({
      theme: undefined,
      platformAppearance: "dark",
      backgroundOpacity: 0.42,
      backgroundBlur: 24,
    });

    expect(lightTokens.productTheme).toBe("luca-silver");
    expect(darkTokens.productTheme).toBe("luca-graphite");
    expect(lightTokens.backgroundOpacity).toBe(0.42);
    expect(lightTokens.backgroundBlur).toBe(24);
    expect(darkTokens.backgroundOpacity).toBe(0.42);
    expect(darkTokens.backgroundBlur).toBe(24);
  });
});
