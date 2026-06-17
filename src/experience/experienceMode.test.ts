import { describe, expect, it } from "vitest";
import {
  EXPERIENCE_MODE_INFO,
  LUCA_EXPERIENCE_MODES,
  audienceTierToExperienceMode,
  canShowCreatorMode,
  deriveCreatorAccessFromBuild,
  evaluateCreatorAccess,
  experienceModeToAudienceTier,
  fromHeaderTier,
  getAvailableExperienceModes,
  getDefaultThemeForExperienceMode,
  getExperienceModeInfo,
  getExperienceModeLabel,
  getOnboardingSelectableModes,
  isExperienceMode,
  mapLegacyTierToExperienceMode,
  toHeaderTier,
  type LucaExperienceMode,
} from "./experienceMode";

describe("experience mode model", () => {
  it("exposes the three official modes in order", () => {
    expect(LUCA_EXPERIENCE_MODES).toEqual(["basic", "pro", "creator"]);
  });

  it("has consistent info entries for every mode", () => {
    for (const mode of LUCA_EXPERIENCE_MODES) {
      expect(EXPERIENCE_MODE_INFO[mode].mode).toBe(mode);
      expect(EXPERIENCE_MODE_INFO[mode].label.length).toBeGreaterThan(0);
    }
  });

  it("returns product-facing labels", () => {
    expect(getExperienceModeLabel("basic")).toBe("Basic");
    expect(getExperienceModeLabel("pro")).toBe("Pro");
    expect(getExperienceModeLabel("creator")).toBe("Creator");
    expect(getExperienceModeInfo("pro").tagline.length).toBeGreaterThan(0);
  });
});

describe("isExperienceMode", () => {
  it("accepts canonical lowercase values", () => {
    expect(isExperienceMode("basic")).toBe(true);
    expect(isExperienceMode("pro")).toBe(true);
    expect(isExperienceMode("creator")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isExperienceMode("BASIC")).toBe(false);
    expect(isExperienceMode("normal")).toBe(false);
    expect(isExperienceMode(undefined)).toBe(false);
    expect(isExperienceMode(null)).toBe(false);
    expect(isExperienceMode(2)).toBe(false);
  });
});

describe("legacy + audience-tier mapping", () => {
  it("maps conceptual legacy names", () => {
    expect(mapLegacyTierToExperienceMode("Normal")).toBe("basic");
    expect(mapLegacyTierToExperienceMode("Tactical")).toBe("pro");
    expect(mapLegacyTierToExperienceMode("Origin")).toBe("creator");
  });

  it("maps existing LucaAudienceTier values", () => {
    expect(mapLegacyTierToExperienceMode("public_standard")).toBe("basic");
    expect(mapLegacyTierToExperienceMode("public_tactical")).toBe("pro");
    expect(mapLegacyTierToExperienceMode("origin")).toBe("creator");
  });

  it("is case/whitespace tolerant and falls back to basic", () => {
    expect(mapLegacyTierToExperienceMode("  TACTICAL  ")).toBe("pro");
    expect(mapLegacyTierToExperienceMode("nonsense")).toBe("basic");
    expect(mapLegacyTierToExperienceMode(null)).toBe("basic");
    expect(mapLegacyTierToExperienceMode(undefined)).toBe("basic");
  });

  it("round-trips experience mode <-> audience tier", () => {
    for (const mode of LUCA_EXPERIENCE_MODES) {
      expect(
        audienceTierToExperienceMode(experienceModeToAudienceTier(mode)),
      ).toBe(mode);
    }
    expect(experienceModeToAudienceTier("basic")).toBe("public_standard");
    expect(experienceModeToAudienceTier("pro")).toBe("public_tactical");
    expect(experienceModeToAudienceTier("creator")).toBe("origin");
  });
});

describe("Header tier bridge", () => {
  it("round-trips mode <-> header tier", () => {
    for (const mode of LUCA_EXPERIENCE_MODES) {
      expect(fromHeaderTier(toHeaderTier(mode))).toBe(mode);
    }
    expect(toHeaderTier("basic")).toBe("BASIC");
    expect(toHeaderTier("creator")).toBe("CREATOR");
    expect(fromHeaderTier("PRO")).toBe("pro");
  });
});

describe("visual defaults", () => {
  it("matches the PR #233 design-system direction", () => {
    const basic = getDefaultThemeForExperienceMode("basic");
    expect(basic.productTheme).toBe("luca-silver");
    expect(basic.appearanceMode).toBe("system");
    expect(basic.accent).toBe("neutral");
    expect(basic.density).toBe("comfortable");

    const pro = getDefaultThemeForExperienceMode("pro");
    expect(pro.productTheme).toBe("luca-graphite");
    expect(pro.appearanceMode).toBe("dark");
    expect(pro.accent).toBe("blue");
    expect(pro.density).toBe("standard");

    const creator = getDefaultThemeForExperienceMode("creator");
    expect(creator.productTheme).toBe("luca-graphite");
    expect(creator.accent).toBe("violet");
    expect(creator.density).toBe("dense");
  });

  it("never turns cyber effects on by default in any mode", () => {
    for (const mode of LUCA_EXPERIENCE_MODES) {
      expect(getDefaultThemeForExperienceMode(mode).cyberEffectsDefaultOn).toBe(
        false,
      );
      expect(getDefaultThemeForExperienceMode(mode).motionStyle).toBe("calm");
    }
  });

  it("only Creator may make cyber effects available", () => {
    expect(getDefaultThemeForExperienceMode("basic").cyberEffectsAvailable).toBe(
      false,
    );
    expect(getDefaultThemeForExperienceMode("pro").cyberEffectsAvailable).toBe(
      false,
    );
    expect(
      getDefaultThemeForExperienceMode("creator").cyberEffectsAvailable,
    ).toBe(true);
  });
});

describe("onboarding selectable modes", () => {
  it("offers Basic and Pro but never Creator", () => {
    const selectable = getOnboardingSelectableModes();
    expect(selectable).toContain("basic");
    expect(selectable).toContain("pro");
    expect(selectable).not.toContain("creator");
  });
});

describe("creator access", () => {
  it("hides Creator with no trusted signals", () => {
    const state = evaluateCreatorAccess({});
    expect(state.eligible).toBe(false);
    expect(canShowCreatorMode(state)).toBe(false);
    expect(state.reason).toMatch(/hidden/i);
  });

  it("grants Creator when any trust marker is present", () => {
    expect(canShowCreatorMode(evaluateCreatorAccess({ sourceBuild: true }))).toBe(
      true,
    );
    expect(
      canShowCreatorMode(evaluateCreatorAccess({ trustedCreatorKey: true })),
    ).toBe(true);
    const reason = evaluateCreatorAccess({ internalBuild: true }).reason;
    expect(reason).toMatch(/granted/i);
  });

  it("derives Creator access from origin build signals", () => {
    expect(
      canShowCreatorMode(
        deriveCreatorAccessFromBuild({
          audienceTier: "origin",
          surfaceLayer: "origin",
        }),
      ),
    ).toBe(true);
    expect(
      canShowCreatorMode(
        deriveCreatorAccessFromBuild({
          audienceTier: "public_standard",
          surfaceLayer: "public",
        }),
      ),
    ).toBe(false);
    expect(
      canShowCreatorMode(
        deriveCreatorAccessFromBuild({
          audienceTier: "public_tactical",
          surfaceLayer: "public",
        }),
      ),
    ).toBe(false);
  });
});

describe("available modes", () => {
  it("excludes Creator unless eligible", () => {
    const ineligible = evaluateCreatorAccess({});
    expect(getAvailableExperienceModes(ineligible)).toEqual(["basic", "pro"]);

    const eligible = evaluateCreatorAccess({ sourceBuild: true });
    const modes: LucaExperienceMode[] = getAvailableExperienceModes(eligible);
    expect(modes).toEqual(["basic", "pro", "creator"]);
  });
});
