import { describe, expect, it } from "vitest";
import { DEFAULT_LUCA_SKIN_ID } from "../config/lucaSkins";
import { LUCA_SKIN_MATERIAL_VARIABLE_NAMES } from "./lucaSkinMaterialBridge";
import { resolveLucaDashboardSkinBoundary } from "./lucaDashboardSkinBoundary";

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

describe("lucaDashboardSkinBoundary", () => {
  it("falls back to Pearl when no selected skin is provided", () => {
    const boundary = resolveLucaDashboardSkinBoundary();

    expect(boundary.skinId).toBe(DEFAULT_LUCA_SKIN_ID);
    expect(boundary.materialVariables["--luca-background-base"]).toBe("#f7f6f2");
  });

  it("returns selected skin material variables for the dashboard boundary", () => {
    const boundary = resolveLucaDashboardSkinBoundary({ selectedSkinId: "carbon" });

    expect(boundary.skinId).toBe("carbon");
    expect(boundary.materialVariables["--luca-background-base"]).toBe("#080a0d");
    expect(Object.keys(boundary.materialVariables).sort()).toEqual(
      [...LUCA_SKIN_MATERIAL_VARIABLE_NAMES].sort(),
    );
  });

  it("falls invalid selectedSkinId back to Pearl variables", () => {
    const boundary = resolveLucaDashboardSkinBoundary({ selectedSkinId: "invalid-skin" });

    expect(boundary.skinId).toBe(DEFAULT_LUCA_SKIN_ID);
    expect(boundary.materialVariables["--luca-accent-primary"]).toBe("#4f7f96");
  });

  it("does not include status or safety variables in the applied map", () => {
    const boundary = resolveLucaDashboardSkinBoundary({ selectedSkinId: "flow" });

    for (const name of Object.keys(boundary.materialVariables)) {
      for (const statusOrSafetyPart of STATUS_OR_SAFETY_NAME_PARTS) {
        expect(name.includes(statusOrSafetyPart), name).toBe(false);
      }
    }
  });
});
