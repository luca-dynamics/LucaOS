import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_LUCA_SKIN_ID, type LucaSkinHostKind } from "../config/lucaSkins";
import { LUCA_SKIN_MATERIAL_VARIABLE_NAMES } from "./lucaSkinMaterialBridge";
import {
  resolveLucaBootSkinBoundary,
  type LucaBootSkinBoundarySurface,
} from "./lucaBootSkinBoundary";

const BOOT_SURFACES: LucaBootSkinBoundarySurface[] = [
  "boot-window",
  "boot-loading",
  "mode-select",
];

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
  "document.body",
  "body.style",
  'document.querySelector("html")',
] as const;

const FORBIDDEN_FLOW_MOTION_STRINGS = [
  "requestAnimationFrame",
  "setInterval",
  "setTimeout",
  "@keyframes",
  "animation:",
  "parallax",
] as const;

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+["'][^"']*components\/boot/i,
  /from\s+["'][^"']*Onboarding/i,
  /from\s+["'][^"']*services\/runtime/i,
  /from\s+["'][^"']*services\/onboarding/i,
] as const;

describe("lucaBootSkinBoundary", () => {
  it("defaults to Pearl material variables", () => {
    const boundary = resolveLucaBootSkinBoundary();

    expect(boundary.skinId).toBe(DEFAULT_LUCA_SKIN_ID);
    expect(boundary.materialVariables["--luca-background-base"]).toBe("#e2edf2");
    expect(boundary.materialVariables["--luca-accent-primary"]).toBe("#3d8fa6");
  });

  it("documents that user skin ownership begins at onboarding", () => {
    const boundary = resolveLucaBootSkinBoundary();

    expect(boundary.safetyNotes.join(" ")).toContain(
      "Boot is locked to Carbon; user skin ownership begins at onboarding.",
    );
  });

  it("defaults surface to boot-window", () => {
    expect(resolveLucaBootSkinBoundary().surface).toBe("boot-window");
  });

  it.each(BOOT_SURFACES)("preserves %s surface intent", (surface) => {
    expect(resolveLucaBootSkinBoundary({ surface }).surface).toBe(surface);
  });

  it("defaults hostKind to desktop-web", () => {
    const boundary = resolveLucaBootSkinBoundary();

    expect(boundary.hostKind).toBe("desktop-web");
    expect(boundary.safetyNotes.join(" ")).toContain("desktop-web");
  });

  it.each(["mobile-web", "mobile-app"] satisfies LucaSkinHostKind[])(
    "keeps %s when explicitly requested",
    (hostKind) => {
      expect(resolveLucaBootSkinBoundary({ hostKind }).hostKind).toBe(hostKind);
    },
  );

  it("respects an explicit reduced-motion request without changing identity", () => {
    const boundary = resolveLucaBootSkinBoundary({
      hostKind: "desktop-web",
      reducedMotion: true,
    });

    expect(boundary.skinId).toBe(DEFAULT_LUCA_SKIN_ID);
    expect(boundary.reducedMotion).toBe(true);
    expect(boundary.materialVariables["--luca-material-blur"]).toBe("16px");
    expect(boundary.safetyNotes.join(" ")).toContain("Reduced motion");
  });

  it("respects reducedTransparency with zero blur and solid opacity", () => {
    const boundary = resolveLucaBootSkinBoundary({
      reducedTransparency: true,
    });

    expect(boundary.reducedTransparency).toBe(true);
    expect(boundary.materialVariables["--luca-material-blur"]).toBe("0px");
    expect(boundary.materialVariables["--luca-material-opacity"]).toBe("1");
    expect(boundary.safetyNotes.join(" ")).toContain("Reduced transparency");
  });

  it("returns the contracted Luca material variable map", () => {
    const boundary = resolveLucaBootSkinBoundary();

    for (const name of LUCA_SKIN_MATERIAL_VARIABLE_NAMES) {
      expect(boundary.materialVariables[name], name).toBeDefined();
    }

    expect(Object.keys(boundary.materialVariables).sort()).toEqual(
      [...LUCA_SKIN_MATERIAL_VARIABLE_NAMES].sort(),
    );
  });

  it("does not include status or safety variables in the applied map", () => {
    const boundary = resolveLucaBootSkinBoundary();

    for (const name of Object.keys(boundary.materialVariables)) {
      for (const statusOrSafetyPart of STATUS_OR_SAFETY_NAME_PARTS) {
        expect(name.includes(statusOrSafetyPart), name).toBe(false);
      }
    }
  });

  it("does not contain DOM mutation, Flow motion, or disallowed service imports", () => {
    const source = readFileSync(new URL("./lucaBootSkinBoundary.ts", import.meta.url), "utf8");

    for (const forbidden of FORBIDDEN_DOM_MUTATION_STRINGS) {
      expect(source.includes(forbidden), forbidden).toBe(false);
    }

    for (const forbidden of FORBIDDEN_FLOW_MOTION_STRINGS) {
      expect(source.includes(forbidden), forbidden).toBe(false);
    }

    for (const forbidden of FORBIDDEN_IMPORT_PATTERNS) {
      expect(source, String(forbidden)).not.toMatch(forbidden);
    }
  });
});
