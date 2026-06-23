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
  it("resolves Pearl values as the default material bridge", () => {
    const variables = getDefaultLucaSkinMaterialVariables();

    expect(variables["--luca-background-base"]).toBe("#f7f6f2");
    expect(variables["--luca-background-elevated"]).toBe("#ffffff");
    expect(variables["--luca-accent-primary"]).toBe("#4f7f96");
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
