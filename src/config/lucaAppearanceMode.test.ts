import { describe, expect, it } from "vitest";
import {
  DEFAULT_LUCA_APPEARANCE_MODE,
  DEFAULT_LUCA_SKIN_ID,
  LUCA_SKIN_IDS,
  isLucaAppearanceMode,
  resolveLucaAppearanceModeForSkin,
  resolveLucaAppearanceSkinId,
} from "./lucaSkins";

/**
 * LucaOS wears ONE identity (the glacier) in light or dark; "system" follows
 * the device. These are the pure rules the app, onboarding, and Settings all
 * resolve through.
 */
describe("Luca appearance modes", () => {
  it("defaults to light, and light is the default skin", () => {
    expect(DEFAULT_LUCA_APPEARANCE_MODE).toBe("light");
    expect(DEFAULT_LUCA_SKIN_ID).toBe("pearl");
    expect(
      resolveLucaAppearanceSkinId(DEFAULT_LUCA_APPEARANCE_MODE, false),
    ).toBe(DEFAULT_LUCA_SKIN_ID);
  });

  it("recognizes only the three real modes", () => {
    for (const mode of ["light", "dark", "system"]) {
      expect(isLucaAppearanceMode(mode)).toBe(true);
    }
    for (const value of ["pearl", "carbon", "", null, undefined, 0, {}]) {
      expect(isLucaAppearanceMode(value)).toBe(false);
    }
  });

  it("resolves explicit modes regardless of the OS signal", () => {
    expect(resolveLucaAppearanceSkinId("light", false)).toBe("pearl");
    expect(resolveLucaAppearanceSkinId("light", true)).toBe("pearl");
    expect(resolveLucaAppearanceSkinId("dark", false)).toBe("carbon");
    expect(resolveLucaAppearanceSkinId("dark", true)).toBe("carbon");
  });

  it("follows the OS signal only for system mode", () => {
    expect(resolveLucaAppearanceSkinId("system", true)).toBe("carbon");
    expect(resolveLucaAppearanceSkinId("system", false)).toBe("pearl");
  });

  it("maps the two mode skins back to their mode and clears for the rest", () => {
    expect(resolveLucaAppearanceModeForSkin("pearl")).toBe("light");
    expect(resolveLucaAppearanceModeForSkin("carbon")).toBe("dark");

    // Every other catalog environment is an explicit choice, not a mode —
    // clearing the mode is what stops system-following from undoing it.
    for (const skinId of LUCA_SKIN_IDS) {
      if (skinId === "pearl" || skinId === "carbon") continue;
      expect(resolveLucaAppearanceModeForSkin(skinId)).toBeUndefined();
    }
  });

  it("round-trips mode -> skin -> mode for the two default modes", () => {
    for (const mode of ["light", "dark"] as const) {
      const skinId = resolveLucaAppearanceSkinId(mode, false);
      expect(resolveLucaAppearanceModeForSkin(skinId)).toBe(mode);
    }
  });
});
