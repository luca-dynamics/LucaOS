import { describe, expect, it } from "vitest";
import {
  getDefaultLucaSkinMaterialVariables,
  getLucaSkinMaterialVariables,
  LUCA_SKIN_MATERIAL_VARIABLE_NAMES,
} from "./lucaSkinMaterialBridge";

const STATUS_OR_SAFETY_NAME_PARTS = [
  "danger",
  "warning",
  "success",
  "info",
  "approval",
  "permission",
  "blocked",
  "mission",
  "voice",
  "listening",
  "vision",
  "screen",
  "stop",
] as const;

describe("lucaSkinMaterialBridge", () => {
  it("resolves Carbon values as the default material bridge", () => {
    const variables = getDefaultLucaSkinMaterialVariables();

    expect(variables["--luca-background-base"]).toBe("#111417");
    expect(variables["--luca-background-elevated"]).toBe("#1b2025");
    expect(variables["--luca-accent-primary"]).toBe("#9fb3c2");
  });

  it("returns every contracted material bridge variable name", () => {
    const variables = getLucaSkinMaterialVariables();

    for (const name of LUCA_SKIN_MATERIAL_VARIABLE_NAMES) {
      expect(variables[name], name).toBeDefined();
    }

    expect(Object.keys(variables).sort()).toEqual(
      [...LUCA_SKIN_MATERIAL_VARIABLE_NAMES].sort(),
    );
  });

  it("maps skin text variables into Luca text targets", () => {
    const variables = getLucaSkinMaterialVariables({ skinId: "carbon" });

    expect(variables["--luca-text-primary"]).toBe("#f2f5f7");
    expect(variables["--luca-text-secondary"]).toBe("#bac5cc");
    expect(variables["--luca-text-tertiary"]).toBe("#89949c");
  });

  it("maps skin accent variables into Luca accent targets", () => {
    const variables = getLucaSkinMaterialVariables({ skinId: "canvas" });

    expect(variables["--luca-accent-primary"]).toBe("#9b653d");
    expect(variables["--luca-accent-soft"]).toBe("#c19161");
    expect(variables["--luca-shadow-glow"]).toBe("rgba(155, 101, 61, 0.10)");
  });

  it("bridges contrast-aware glass texture tokens", () => {
    const light = getLucaSkinMaterialVariables({ skinId: "pearl" });
    const adaptiveLight = getLucaSkinMaterialVariables({ skinId: "flow" });
    const dark = getLucaSkinMaterialVariables({ skinId: "carbon" });

    expect(light["--luca-material-glass-highlight"]).toContain("#4f7f96");
    expect(light["--luca-material-glass-rim"]).toContain("#4f5e68");
    expect(adaptiveLight["--luca-material-glass-highlight"]).toContain("#5f8fa3");
    expect(adaptiveLight["--luca-material-glass-rim"]).toContain("#4e6270");
    expect(dark["--luca-material-glass-highlight"]).toBe("rgb(255 255 255 / 0.14)");
  });

  it.each(["pearl", "flow", "canvas", "mist"])(
    "gives the %s light skin explicit tonal surfaces and edge depth",
    (skinId) => {
      const variables = getLucaSkinMaterialVariables({ skinId });

      expect(variables["--luca-material-card-surface"]).toContain("color-mix");
      expect(variables["--luca-material-control-surface"]).toContain("color-mix");
      expect(variables["--luca-material-card-shadow"]).toContain("inset 0 1px");
      expect(Number(variables["--luca-material-border-strength"])).toBeGreaterThanOrEqual(0.56);
    },
  );

  it("preserves the established dark-skin surface formulas", () => {
    const variables = getLucaSkinMaterialVariables({ skinId: "carbon" });

    expect(variables["--luca-material-card-surface"]).toContain("var(--luca-surface-glass)");
    expect(variables["--luca-material-card-shadow"]).toBe("none");
    expect(variables["--luca-material-control-shadow"]).toBe("none");
  });

  it("keeps material blur at 0px when reduced transparency is requested", () => {
    const variables = getLucaSkinMaterialVariables({
      skinId: "flow",
      reducedTransparency: true,
    });

    expect(variables["--luca-material-blur"]).toBe("0px");
    expect(variables["--luca-material-opacity"]).toBe("1");
  });

  it("inherits the Flow mobile-web blur cap from the skin registry", () => {
    const variables = getLucaSkinMaterialVariables({
      skinId: "flow",
      hostKind: "mobile-web",
    });

    expect(variables["--luca-material-blur"]).toBe("4px");
  });

  it("does not include status or safety variables in the bridge contract", () => {
    for (const name of LUCA_SKIN_MATERIAL_VARIABLE_NAMES) {
      for (const statusOrSafetyPart of STATUS_OR_SAFETY_NAME_PARTS) {
        expect(name.includes(statusOrSafetyPart), name).toBe(false);
      }
    }
  });
});
