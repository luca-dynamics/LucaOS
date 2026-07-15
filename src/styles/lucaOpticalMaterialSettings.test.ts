import { describe, expect, it } from "vitest";
import {
  DEFAULT_LUCA_OPTICAL_MATERIAL,
  getLucaOpticalMaterialCssVariables,
  normalizeLucaOpticalMaterialSettings,
} from "./lucaOpticalMaterialSettings";

describe("Luca optical material settings", () => {
  it("uses restrained production defaults", () => {
    const value = normalizeLucaOpticalMaterialSettings();
    expect(value).toEqual(DEFAULT_LUCA_OPTICAL_MATERIAL);
    expect(value.glass.frost).toBeLessThan(value.glass.refraction);
    expect(value.metal.gradient).toHaveLength(6);
  });

  it("clamps unsafe persisted values and repairs short ramps", () => {
    const value = normalizeLucaOpticalMaterialSettings({
      glass: { ...DEFAULT_LUCA_OPTICAL_MATERIAL.glass, refraction: 4, frost: -2 },
      metal: { ...DEFAULT_LUCA_OPTICAL_MATERIAL.metal, repeats: 99, gradient: ["#fff"] },
    });
    expect(value.glass.refraction).toBe(1);
    expect(value.glass.frost).toBe(0);
    expect(value.metal.repeats).toBe(12);
    expect(value.metal.gradient).toEqual(DEFAULT_LUCA_OPTICAL_MATERIAL.metal.gradient);
  });

  it("exports the shared CSS control contract", () => {
    expect(getLucaOpticalMaterialCssVariables()["--luca-glass-refraction"]).toBe("0.58");
    expect(getLucaOpticalMaterialCssVariables()["--luca-metal-rgb-split"]).toBe("0.34");
  });
});
