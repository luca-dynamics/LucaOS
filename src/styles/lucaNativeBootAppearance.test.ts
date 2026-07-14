import { describe, expect, it } from "vitest";

import { LUCA_SKIN_IDS } from "../config/lucaSkins";
import { LUCA_SKIN_MATERIAL_VARIABLE_NAMES } from "./lucaSkinMaterialBridge";
import { createLucaNativeBootAppearanceSnapshot } from "./lucaNativeBootAppearance";

describe("createLucaNativeBootAppearanceSnapshot", () => {
  it("creates a complete, skin-aware snapshot for every Luca skin", () => {
    for (const skinId of LUCA_SKIN_IDS) {
      const snapshot = createLucaNativeBootAppearanceSnapshot({ skinId });

      expect(snapshot.skinId).toBe(skinId);
      expect(["light", "dark"]).toContain(snapshot.materialTone);
      expect(Object.keys(snapshot.variables).sort()).toEqual(
        [...LUCA_SKIN_MATERIAL_VARIABLE_NAMES].sort(),
      );
      expect(snapshot.variables["--luca-background-base"]).toMatch(/^#|gradient\(/);
      expect(snapshot.variables["--luca-text-primary"]).toBeTruthy();
    }
  });

  it("normalizes unsafe slider values before they cross into Electron", () => {
    const snapshot = createLucaNativeBootAppearanceSnapshot({
      skinId: "pearl",
      userMaterialOpacity: 4,
      userMaterialBlurPx: 400,
    });

    expect(snapshot.variables["--luca-material-opacity"]).toBe("1");
    expect(snapshot.variables["--luca-material-blur"]).toBe("80px");
  });

  it("falls back to the default skin for unknown input", () => {
    const snapshot = createLucaNativeBootAppearanceSnapshot({
      skinId: "not-a-skin",
    });

    expect(snapshot.skinId).toBe("carbon");
    expect(snapshot.materialTone).toBe("dark");
  });
});
