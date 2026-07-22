import { describe, expect, it } from "vitest";
import {
  getDefaultLucaSkinCssVariables,
  getLucaSkinCssVariables,
  LUCA_SKIN_CSS_VARIABLE_NAMES,
} from "./lucaSkinRegistry";

describe("lucaSkinRegistry", () => {
  it("resolves Pearl as the default skin", () => {
    const variables = getDefaultLucaSkinCssVariables();

    expect(variables["--luca-skin-bg-base"]).toBe("#e2edf2");
    expect(variables["--luca-skin-accent-primary"]).toBe("#3d8fa6");
  });

  it("returns every contracted CSS variable name", () => {
    const variables = getLucaSkinCssVariables();

    for (const name of LUCA_SKIN_CSS_VARIABLE_NAMES) {
      expect(variables[name], name).toBeDefined();
    }

    expect(Object.keys(variables).sort()).toEqual([...LUCA_SKIN_CSS_VARIABLE_NAMES].sort());
  });

  it("caps Flow blur for mobile web hosts", () => {
    const variables = getLucaSkinCssVariables({ skinId: "flow", hostKind: "mobile-web" });

    expect(variables["--luca-skin-glass-blur"]).toBe("4px");
  });

  it("uses contrast-aware glass tokens for light and dark skins", () => {
    const light = getLucaSkinCssVariables({ skinId: "pearl" });
    const adaptiveLight = getLucaSkinCssVariables({ skinId: "flow" });
    const dark = getLucaSkinCssVariables({ skinId: "carbon" });

    expect(light["--luca-skin-glass-rim"]).toContain("#5b636f");
    expect(light["--luca-skin-glass-shadow"]).toContain("#2b303a");
    expect(adaptiveLight["--luca-skin-glass-rim"]).toContain("#4e6270");
    expect(adaptiveLight["--luca-skin-glass-shadow"]).toContain("#17232c");
    expect(dark["--luca-skin-glass-rim"]).toBe("rgb(255 255 255 / 0.24)");
    expect(dark["--luca-skin-glass-shadow"]).toBe("rgb(0 0 0 / 0.18)");
  });

  it("returns no blur when reduced transparency is requested", () => {
    const variables = getLucaSkinCssVariables({ skinId: "flow", reducedTransparency: true });

    expect(variables["--luca-skin-glass-blur"]).toBe("0px");
    expect(variables["--luca-skin-glass-opacity"]).toBe("1");
  });

  it("returns static/minimal motion values when reduced motion is requested", () => {
    const variables = getLucaSkinCssVariables({ skinId: "flow", reducedMotion: true });

    expect(variables["--luca-skin-motion-speed"]).toBe("static");
    expect(variables["--luca-skin-motion-softness"]).toBe("none");
    expect(variables["--luca-skin-motion-glow"]).toBe("none");
  });

  it("falls back to Pearl for invalid skin IDs", () => {
    const variables = getLucaSkinCssVariables({ skinId: "not-a-skin" });

    expect(variables["--luca-skin-bg-base"]).toBe("#e2edf2");
  });
});
