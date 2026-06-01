import { describe, expect, it } from "vitest";
import {
  settingsAdvancedFeatureCandidateTabIds,
  settingsClassificationLabels,
  settingsExperienceMap,
  settingsOriginModeCandidateTabIds,
  settingsSensitiveTabIds,
  settingsTacticalModeCandidateTabIds,
} from "./settingsExperienceMap";

const expectedSettingsTabIds = [
  "general",
  "brain",
  "voice",
  "vision",
  "model-manager",
  "personality",
  "autonomy",
  "profile",
  "lucalink",
  "mcp-bridge",
  "iot",
  "connectors",
  "data",
  "knowledge-bridge",
  "about",
];

const unique = (values: readonly string[]) => Array.from(new Set(values));

describe("settingsExperienceMap", () => {
  it("represents every current Settings modal tab exactly once", () => {
    const mappedIds = settingsExperienceMap.map((entry) => entry.id);

    expect(unique(mappedIds)).toEqual(mappedIds);
    expect(mappedIds).toEqual(expectedSettingsTabIds);
  });

  it("assigns supported classification labels to every tab", () => {
    const supportedLabels = new Set(settingsClassificationLabels);

    for (const entry of settingsExperienceMap) {
      expect(entry.classificationLabels.length, entry.id).toBeGreaterThan(0);
      for (const label of entry.classificationLabels) {
        expect(supportedLabels.has(label), `${entry.id}:${label}`).toBe(true);
      }
    }
  });

  it("marks current sensitive settings surfaces", () => {
    expect(settingsSensitiveTabIds).toEqual(
      expect.arrayContaining([
        "general",
        "brain",
        "voice",
        "vision",
        "personality",
        "autonomy",
        "profile",
        "lucalink",
        "mcp-bridge",
        "iot",
        "connectors",
        "data",
        "knowledge-bridge",
      ]),
    );
    expect(settingsSensitiveTabIds).not.toContain("about");
  });

  it("identifies advanced, tactical, and origin follow-up candidates", () => {
    expect(settingsAdvancedFeatureCandidateTabIds).toEqual([
      "model-manager",
      "mcp-bridge",
      "iot",
      "connectors",
    ]);
    expect(settingsTacticalModeCandidateTabIds).toEqual(["autonomy"]);
    expect(settingsOriginModeCandidateTabIds).toEqual([]);
  });

  it("keeps MCP Bridge and Connectors tactical/advanced mobile surfaces", () => {
    const tacticalAdvancedLabels = [
      "tactical-user",
      "advanced-feature",
      "privacy-sensitive",
      "permission-sensitive",
      "runtime-sensitive",
      "needs-product-language-review",
      "needs-mobile-layout-review",
    ];

    const mcpBridge = settingsExperienceMap.find(
      (entry) => entry.id === "mcp-bridge",
    );
    const connectors = settingsExperienceMap.find(
      (entry) => entry.id === "connectors",
    );

    expect(mcpBridge?.availability).toEqual(["desktop", "mobile"]);
    expect(mcpBridge?.classificationLabels).toEqual(tacticalAdvancedLabels);
    expect(mcpBridge?.futurePlacement).toBe("advanced-features");

    expect(connectors?.availability).toEqual(["desktop", "mobile"]);
    expect(connectors?.classificationLabels).toEqual(tacticalAdvancedLabels);
    expect(connectors?.futurePlacement).toBe("advanced-features");
  });
});
