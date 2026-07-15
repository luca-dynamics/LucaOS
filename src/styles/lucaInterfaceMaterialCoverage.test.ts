import { describe, expect, it } from "vitest";

const { existsSync } = process.getBuiltinModule("node:fs");

import {
  LUCA_INTERFACE_MATERIAL_AREAS,
  LUCA_INTERFACE_MATERIAL_COVERAGE,
  LUCA_INTERFACE_MATERIAL_COVERAGE_BY_AREA,
} from "./lucaInterfaceMaterialCoverage";

describe("Luca interface material coverage", () => {
  it("covers every lifecycle and interface area exactly once", () => {
    const coveredAreas = LUCA_INTERFACE_MATERIAL_COVERAGE.map((entry) => entry.area);

    expect(new Set(coveredAreas).size).toBe(coveredAreas.length);
    expect([...coveredAreas].sort()).toEqual([...LUCA_INTERFACE_MATERIAL_AREAS].sort());
    expect(Object.keys(LUCA_INTERFACE_MATERIAL_COVERAGE_BY_AREA).sort()).toEqual(
      [...LUCA_INTERFACE_MATERIAL_AREAS].sort(),
    );
  });

  it("gives every area owners, semantic roles, and a transparency fallback", () => {
    for (const entry of LUCA_INTERFACE_MATERIAL_COVERAGE) {
      expect(entry.owners.length, entry.area).toBeGreaterThan(0);
      expect(entry.materialRoles.length, entry.area).toBeGreaterThan(0);
      expect(entry.reducedTransparency, entry.area).toMatch(/solid/);
    }
  });

  it("keeps every declared material owner attached to the live repository", () => {
    for (const entry of LUCA_INTERFACE_MATERIAL_COVERAGE) {
      for (const owner of entry.owners) {
        expect(existsSync(owner), `${entry.area}: ${owner}`).toBe(true);
      }
    }
  });

  it("keeps matched WebGL out of repeated interface chrome", () => {
    const repeatedChromeAreas = [
      "desktop-shell",
      "mobile-shell",
      "settings",
      "mini-chat",
      "presence-widget",
      "overlay",
      "modal-dialog",
    ] as const;

    for (const area of repeatedChromeAreas) {
      expect(LUCA_INTERFACE_MATERIAL_COVERAGE_BY_AREA[area].opticalTier).not.toBe(
        "matched-webgl",
      );
    }
  });

  it("records the no-glass-disc rule for every face-led lifecycle surface", () => {
    expect(LUCA_INTERFACE_MATERIAL_COVERAGE_BY_AREA["native-boot"].notes).toContain(
      "no glass disc",
    );
    expect(LUCA_INTERFACE_MATERIAL_COVERAGE_BY_AREA["presence-widget"].notes).toContain(
      "never receives a circular overlay",
    );
  });

  it("keeps boot fixed while onboarding begins user skin ownership", () => {
    expect(LUCA_INTERFACE_MATERIAL_COVERAGE_BY_AREA["native-boot"].skinBoundary).toBe(
      "fixed-boot-identity",
    );
    expect(LUCA_INTERFACE_MATERIAL_COVERAGE_BY_AREA.onboarding.skinBoundary).toBe(
      "onboarding-boundary",
    );
  });
});
