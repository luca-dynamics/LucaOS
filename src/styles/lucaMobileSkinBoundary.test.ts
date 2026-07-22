import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_LUCA_SKIN_ID } from "../config/lucaSkins";
import { LUCA_SKIN_MATERIAL_VARIABLE_NAMES } from "./lucaSkinMaterialBridge";
import { resolveLucaMobileSkinBoundary } from "./lucaMobileSkinBoundary";

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

const FORBIDDEN_DOM_MUTATION_STRINGS = [
  "document.documentElement",
  "style.setProperty",
] as const;

const FORBIDDEN_FLOW_MOTION_STRINGS = [
  "requestAnimationFrame",
  "setInterval",
  "setTimeout",
  "@keyframes",
  "animation",
] as const;

describe("lucaMobileSkinBoundary", () => {
  it("defaults to Pearl material variables", () => {
    const boundary = resolveLucaMobileSkinBoundary();

    expect(boundary.skinId).toBe(DEFAULT_LUCA_SKIN_ID);
    expect(boundary.materialVariables["--luca-background-base"]).toBe("#e2edf2");
    expect(boundary.materialVariables["--luca-accent-primary"]).toBe("#3d8fa6");
  });

  it("falls invalid selectedSkinId back to Pearl variables", () => {
    const boundary = resolveLucaMobileSkinBoundary({ selectedSkinId: "invalid-skin" });

    expect(boundary.skinId).toBe(DEFAULT_LUCA_SKIN_ID);
    expect(boundary.materialVariables["--luca-background-base"]).toBe("#e2edf2");
    expect(boundary.safetyNotes.join(" ")).toContain("Luca Light");
  });

  it("defaults hostKind to mobile-web", () => {
    const boundary = resolveLucaMobileSkinBoundary();

    expect(boundary.hostKind).toBe("mobile-web");
    expect(boundary.safetyNotes.join(" ")).toContain("mobile-web");
  });

  it("keeps mobile-app when explicitly requested", () => {
    const boundary = resolveLucaMobileSkinBoundary({ hostKind: "mobile-app" });

    expect(boundary.hostKind).toBe("mobile-app");
  });

  it("forces Flow reducedMotion true and returns static material variables", () => {
    const boundary = resolveLucaMobileSkinBoundary({
      selectedSkinId: "flow",
      hostKind: "mobile-web",
      reducedMotion: false,
    });

    expect(boundary.skinId).toBe("flow");
    expect(boundary.reducedMotion).toBe(true);
    expect(boundary.materialVariables["--luca-material-blur"]).toBe("4px");
    expect(boundary.safetyNotes.join(" ")).toContain("Flow remains static");
  });

  it("respects reducedTransparency with zero blur and solid opacity", () => {
    const boundary = resolveLucaMobileSkinBoundary({
      selectedSkinId: "flow",
      reducedTransparency: true,
    });

    expect(boundary.reducedTransparency).toBe(true);
    expect(boundary.materialVariables["--luca-material-blur"]).toBe("0px");
    expect(boundary.materialVariables["--luca-material-opacity"]).toBe("1");
    expect(boundary.safetyNotes.join(" ")).toContain("Reduced transparency");
  });

  it("returns the contracted Luca material variable map", () => {
    const boundary = resolveLucaMobileSkinBoundary({ selectedSkinId: "canvas" });

    for (const name of LUCA_SKIN_MATERIAL_VARIABLE_NAMES) {
      expect(boundary.materialVariables[name], name).toBeDefined();
    }

    expect(Object.keys(boundary.materialVariables).sort()).toEqual(
      [...LUCA_SKIN_MATERIAL_VARIABLE_NAMES].sort(),
    );
  });

  it("does not include status or safety variables in the applied map", () => {
    const boundary = resolveLucaMobileSkinBoundary({ selectedSkinId: "flow" });

    for (const name of Object.keys(boundary.materialVariables)) {
      for (const statusOrSafetyPart of STATUS_OR_SAFETY_NAME_PARTS) {
        expect(name.includes(statusOrSafetyPart), name).toBe(false);
      }
    }
  });

  it("does not contain DOM mutation or Flow motion implementation strings", () => {
    const source = readFileSync(new URL("./lucaMobileSkinBoundary.ts", import.meta.url), "utf8");

    for (const forbidden of FORBIDDEN_DOM_MUTATION_STRINGS) {
      expect(source.includes(forbidden), forbidden).toBe(false);
    }

    for (const forbidden of FORBIDDEN_FLOW_MOTION_STRINGS) {
      expect(source.includes(forbidden), forbidden).toBe(false);
    }
  });
});
