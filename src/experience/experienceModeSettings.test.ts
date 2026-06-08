import { describe, expect, it } from "vitest";
import { evaluateCreatorAccess, toHeaderTier } from "./experienceMode";
import {
  getExperienceModeOptions,
  getIntentionalExperienceModeSettingsUpdate,
  getExperienceModeSettingsUpdate,
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
    expect(normalizeSelectableExperienceMode("creator", noCreatorAccess)).toBe(
      "basic",
    );
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

  it("provides the calm product descriptions for each visible option", () => {
    expect(getExperienceModeOptions(creatorAccess)).toEqual([
      {
        mode: "basic",
        label: "Basic",
        description: "Calm, simple, everyday Luca.",
      },
      {
        mode: "pro",
        label: "Pro",
        description: "Advanced tools, local/BYOK controls, diagnostics.",
      },
      {
        mode: "creator",
        label: "Creator",
        description: "Source-authority mode for LucaOS builders.",
      },
    ]);
  });

  it("round-trips persisted Pro and maps it to the Header PRO tier", () => {
    const stored = JSON.parse(
      JSON.stringify({ general: { experienceMode: "pro" } }),
    );
    const mode = resolvePersistedExperienceMode(stored, noCreatorAccess);

    expect(mode).toBe("pro");
    expect(toHeaderTier(mode)).toBe("PRO");
  });
  it.each([
    ["basic", "PROFESSIONAL"],
    ["pro", "MASTER_SYSTEM"],
    ["creator", "MASTER_SYSTEM"],
  ] as const)(
    "maps an explicit %s selection to the existing %s theme setting",
    (mode, theme) => {
      expect(getExperienceModeSettingsUpdate(mode)).toEqual({
        experienceMode: mode,
        theme,
      });
    },
  );

  it("does not mutate appearance preferences while resolving stored modes", () => {
    const stored = {
      general: {
        experienceMode: "pro",
        theme: "FROST",
        backgroundOpacity: 0.47,
        backgroundBlur: 22,
      },
    };

    expect(resolvePersistedExperienceMode(stored, noCreatorAccess)).toBe("pro");
    expect(stored.general).toEqual({
      experienceMode: "pro",
      theme: "FROST",
      backgroundOpacity: 0.47,
      backgroundBlur: 22,
    });
  });
  it("only creates a visual-default update for a different selected mode", () => {
    expect(
      getIntentionalExperienceModeSettingsUpdate("basic", "basic"),
    ).toBeNull();
    expect(getIntentionalExperienceModeSettingsUpdate("basic", "pro")).toEqual({
      experienceMode: "pro",
      theme: "MASTER_SYSTEM",
    });
    expect(getIntentionalExperienceModeSettingsUpdate("pro", "basic")).toEqual({
      experienceMode: "basic",
      theme: "PROFESSIONAL",
    });
  });
});
