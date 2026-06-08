import { describe, expect, it } from "vitest";
import {
  evaluateCreatorAccess,
  toHeaderTier,
} from "./experienceMode";
import {
  getExperienceModeOptions,
  normalizeSelectableExperienceMode,
  resolvePersistedExperienceMode,
} from "./experienceModeSettings";

const noCreatorAccess = evaluateCreatorAccess({});
const creatorAccess = evaluateCreatorAccess({ sourceBuild: true });

describe("persisted Experience Mode settings", () => {
  it("defaults to Basic when no stored mode exists", () => {
    expect(resolvePersistedExperienceMode({}, noCreatorAccess)).toBe("basic");
  });

  it.each([
    ["Normal", "basic"],
    ["Tactical", "pro"],
    ["Origin", "creator"],
    ["public_standard", "basic"],
    ["public_tactical", "pro"],
    ["BASIC", "basic"],
    ["PRO", "pro"],
    ["CREATOR", "creator"],
  ] as const)("migrates %s to %s when eligible", (legacy, expected) => {
    expect(
      resolvePersistedExperienceMode(
        { general: { tier: legacy } },
        creatorAccess,
      ),
    ).toBe(expected);
  });

  it("does not restore Creator without eligible access", () => {
    expect(
      resolvePersistedExperienceMode(
        { general: { experienceMode: "CREATOR" } },
        noCreatorAccess,
      ),
    ).toBe("basic");
    expect(
      normalizeSelectableExperienceMode("creator", noCreatorAccess),
    ).toBe("basic");
  });

  it("excludes Creator from Settings options by default", () => {
    expect(
      getExperienceModeOptions(noCreatorAccess).map(({ mode }) => mode),
    ).toEqual(["basic", "pro"]);
  });

  it("includes Creator in Settings options for eligible builds", () => {
    expect(
      getExperienceModeOptions(creatorAccess).map(({ mode }) => mode),
    ).toEqual(["basic", "pro", "creator"]);
  });

  it("round-trips persisted Pro and maps it to the Header PRO tier", () => {
    const stored = JSON.parse(
      JSON.stringify({ general: { experienceMode: "pro" } }),
    );
    const mode = resolvePersistedExperienceMode(stored, noCreatorAccess);

    expect(mode).toBe("pro");
    expect(toHeaderTier(mode)).toBe("PRO");
  });
});
