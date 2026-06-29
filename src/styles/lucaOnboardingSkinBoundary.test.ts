import { describe, expect, it } from "vitest";
import { DEFAULT_LUCA_SKIN_ID } from "../config/lucaSkins";
import { LUCA_SKIN_MATERIAL_VARIABLE_NAMES } from "./lucaSkinMaterialBridge";
import { LUCA_SKIN_PRESENCE_VARIABLE_NAMES } from "./lucaSkinPresence";
import { resolveLucaOnboardingSkinBoundary } from "./lucaOnboardingSkinBoundary";

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

describe("lucaOnboardingSkinBoundary", () => {
  it("falls back to Carbon, desktop-web, and the welcome surface by default", () => {
    const boundary = resolveLucaOnboardingSkinBoundary();
    expect(boundary.skinId).toBe(DEFAULT_LUCA_SKIN_ID);
    expect(boundary.hostKind).toBe("desktop-web");
    expect(boundary.surface).toBe("onboarding-welcome");
  });

  it("falls invalid selected skin back to Carbon variables", () => {
    const boundary = resolveLucaOnboardingSkinBoundary({
      selectedSkinId: "not-a-skin",
    });
    expect(boundary.skinId).toBe(DEFAULT_LUCA_SKIN_ID);
    expect(boundary.materialVariables["--luca-accent-primary"]).toBe("#9fb3c2");
  });

  it("returns complete material and presence variable maps", () => {
    const boundary = resolveLucaOnboardingSkinBoundary({ selectedSkinId: "carbon" });
    expect(boundary.skinId).toBe("carbon");
    expect(Object.keys(boundary.materialVariables).sort()).toEqual(
      [...LUCA_SKIN_MATERIAL_VARIABLE_NAMES].sort(),
    );
    expect(Object.keys(boundary.presenceVariables).sort()).toEqual(
      [...LUCA_SKIN_PRESENCE_VARIABLE_NAMES].sort(),
    );
  });

  it("forces Flow reduced motion and honors reduced transparency", () => {
    const flow = resolveLucaOnboardingSkinBoundary({ selectedSkinId: "flow" });
    expect(flow.reducedMotion).toBe(true);

    const reduced = resolveLucaOnboardingSkinBoundary({
      selectedSkinId: "flow",
      reducedTransparency: true,
    });
    expect(reduced.presenceVariables["--luca-skin-presence-ambient-blur"]).toBe(
      "0px",
    );
    expect(reduced.materialVariables["--luca-material-blur"]).toBe("0px");
  });

  it("preserves an explicit surface intent and host kind", () => {
    const boundary = resolveLucaOnboardingSkinBoundary({
      selectedSkinId: "flow",
      surface: "onboarding-finish",
      hostKind: "mobile-web",
    });
    expect(boundary.surface).toBe("onboarding-finish");
    expect(boundary.hostKind).toBe("mobile-web");
  });

  it("excludes status and safety token names from both maps", () => {
    const boundary = resolveLucaOnboardingSkinBoundary({ selectedSkinId: "flow" });
    const names = [
      ...Object.keys(boundary.materialVariables),
      ...Object.keys(boundary.presenceVariables),
    ];
    for (const name of names) {
      for (const part of STATUS_OR_SAFETY_NAME_PARTS) {
        expect(name.includes(part), name).toBe(false);
      }
    }
  });
});
