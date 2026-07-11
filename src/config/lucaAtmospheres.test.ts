import { describe, expect, it } from "vitest";
import {
  DEFAULT_LUCA_ATMOSPHERE,
  buildLucaAtmosphereBackground,
  normalizeLucaAtmosphere,
} from "./lucaAtmospheres";

describe("Luca Atmospheres", () => {
  it("keeps the feature off by default", () => {
    expect(normalizeLucaAtmosphere(undefined)).toEqual(DEFAULT_LUCA_ATMOSPHERE);
    expect(buildLucaAtmosphereBackground(undefined)).toBe("transparent");
  });

  it("normalizes unsafe persisted values", () => {
    const value = normalizeLucaAtmosphere({
      enabled: true,
      shape: "unknown",
      softnessPx: 999,
      noise: -2,
      intensity: 4,
      colors: [{ hex: "not-a-colour", x: -4, y: 120 }],
    });
    expect(value.shape).toBe("mesh");
    expect(value.softnessPx).toBe(64);
    expect(value.noise).toBe(0);
    expect(value.intensity).toBe(1);
    expect(value.colors[0]).toEqual({ hex: "#7FA6C0", x: 0, y: 100 });
  });

  it("builds each supported CSS gradient", () => {
    for (const shape of ["mesh", "flow", "linear", "radial", "conic"] as const) {
      const css = buildLucaAtmosphereBackground({
        ...DEFAULT_LUCA_ATMOSPHERE,
        enabled: true,
        shape,
      });
      expect(css).toContain("gradient(");
      expect(css).not.toContain("undefined");
    }
  });
});
