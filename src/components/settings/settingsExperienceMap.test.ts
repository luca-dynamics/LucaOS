import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  settingsAdvancedFeatureCandidateTabIds,
  settingsClassificationLabels,
  settingsExperienceMap,
  settingsOriginModeCandidateTabIds,
  settingsSensitiveTabIds,
  settingsTacticalModeCandidateTabIds,
} from "./settingsExperienceMap";

const settingsModalSource = readFileSync(
  resolve(process.cwd(), "src/components/SettingsModal.tsx"),
  "utf8",
);

const currentSettingsModalTabIds = Array.from(
  settingsModalSource.matchAll(/id:\s*"([^"]+)"/g),
).map((match) => match[1]);

const unique = (values: readonly string[]) => Array.from(new Set(values));

describe("settingsExperienceMap", () => {
  it("represents every current Settings modal tab exactly once", () => {
    const mappedIds = settingsExperienceMap.map((entry) => entry.id);

    expect(unique(mappedIds)).toEqual(mappedIds);
    expect(mappedIds).toEqual(currentSettingsModalTabIds);
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
    expect(settingsAdvancedFeatureCandidateTabIds).toEqual(
      expect.arrayContaining(["model-manager", "iot", "connectors"]),
    );
    expect(settingsTacticalModeCandidateTabIds).toEqual(["autonomy"]);
    expect(settingsOriginModeCandidateTabIds).toEqual(["mcp-bridge"]);
  });
});
