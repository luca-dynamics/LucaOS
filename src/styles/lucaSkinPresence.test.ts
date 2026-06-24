import { describe, expect, it } from "vitest";
import { DEFAULT_LUCA_SKIN_ID, LUCA_SKIN_IDS } from "../config/lucaSkins";
import {
  LUCA_SKIN_PRESENCE_VARIABLE_NAMES,
  getDefaultLucaSkinPresenceVariables,
  getLucaSkinPresenceVariableEntries,
  getLucaSkinPresenceVariables,
  isLucaSkinBloomIridescent,
} from "./lucaSkinPresence";

const SAFETY_OR_STATUS_NAME_PARTS = [
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

describe("lucaSkinPresence", () => {
  it("returns exactly the declared presence variable names for every skin", () => {
    for (const skinId of LUCA_SKIN_IDS) {
      const variables = getLucaSkinPresenceVariables({ skinId });
      expect(Object.keys(variables).sort()).toEqual(
        [...LUCA_SKIN_PRESENCE_VARIABLE_NAMES].sort(),
      );
    }
  });

  it("falls back to the default skin for missing or invalid ids", () => {
    const fallback = getLucaSkinPresenceVariables({ skinId: "not-a-skin" });
    const def = getDefaultLucaSkinPresenceVariables();
    expect(fallback).toEqual(def);
    expect(getLucaSkinPresenceVariables()).toEqual(def);
    expect(DEFAULT_LUCA_SKIN_ID).toBe("pearl");
  });

  it("marks only Flow's edge bloom as iridescent", () => {
    expect(isLucaSkinBloomIridescent("flow")).toBe(true);
    expect(isLucaSkinBloomIridescent("pearl")).toBe(false);
    expect(isLucaSkinBloomIridescent("carbon")).toBe(false);
    expect(isLucaSkinBloomIridescent("canvas")).toBe(false);
  });

  it("uses screen blend on dark/adaptive skins and normal on light/warm skins", () => {
    expect(
      getLucaSkinPresenceVariables({ skinId: "carbon" })[
        "--luca-skin-presence-ambient-blend"
      ],
    ).toBe("screen");
    expect(
      getLucaSkinPresenceVariables({ skinId: "flow" })[
        "--luca-skin-presence-ambient-blend"
      ],
    ).toBe("screen");
    expect(
      getLucaSkinPresenceVariables({ skinId: "pearl" })[
        "--luca-skin-presence-ambient-blend"
      ],
    ).toBe("normal");
    expect(
      getLucaSkinPresenceVariables({ skinId: "canvas" })[
        "--luca-skin-presence-ambient-blend"
      ],
    ).toBe("normal");
  });

  it("caps ambient blur by host policy (Flow mobile-web)", () => {
    const desktop = getLucaSkinPresenceVariables({ skinId: "flow" });
    const mobileWeb = getLucaSkinPresenceVariables({
      skinId: "flow",
      hostKind: "mobile-web",
    });
    // Flow ambient blur is 32px; mobile-web host policy caps blur to 10px.
    expect(desktop["--luca-skin-presence-ambient-blur"]).toBe("32px");
    expect(mobileWeb["--luca-skin-presence-ambient-blur"]).toBe("10px");
  });

  it("collapses to zero blur and normal blend under reduced transparency", () => {
    const reduced = getLucaSkinPresenceVariables({
      skinId: "flow",
      reducedTransparency: true,
    });
    expect(reduced["--luca-skin-presence-ambient-blur"]).toBe("0px");
    expect(reduced["--luca-skin-presence-ambient-blend"]).toBe("normal");
    expect(
      Number(reduced["--luca-skin-presence-ambient-opacity"]),
    ).toBeLessThanOrEqual(0.3);
  });

  it("keeps opacity and bloom within 0..1", () => {
    for (const skinId of LUCA_SKIN_IDS) {
      const v = getLucaSkinPresenceVariables({ skinId });
      const opacity = Number(v["--luca-skin-presence-ambient-opacity"]);
      const bloom = Number(v["--luca-skin-presence-bloom"]);
      expect(opacity).toBeGreaterThanOrEqual(0);
      expect(opacity).toBeLessThanOrEqual(1);
      expect(bloom).toBeGreaterThanOrEqual(0);
      expect(bloom).toBeLessThanOrEqual(1);
    }
  });

  it("never exposes status or safety semantics in presence variables", () => {
    const serialized = JSON.stringify(
      LUCA_SKIN_IDS.map((skinId) => getLucaSkinPresenceVariableEntries({ skinId })),
    ).toLowerCase();
    for (const part of SAFETY_OR_STATUS_NAME_PARTS) {
      // Variable NAMES must not carry status/safety semantics.
      for (const name of LUCA_SKIN_PRESENCE_VARIABLE_NAMES) {
        expect(name.includes(part)).toBe(false);
      }
    }
    // And no danger/warning/success status color tokens leak into the values.
    expect(serialized).not.toMatch(/--luca-(danger|warning|success|info)/);
  });
});
