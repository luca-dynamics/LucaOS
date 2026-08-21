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
  "appearance",
  "brain",
  "voice",
  "model-manager",
  "personality",
  "autonomy",
  "lucalink",
  "integrations",
  "data",
];

const unique = (values: readonly string[]) => Array.from(new Set(values));

describe("settingsExperienceMap", () => {
  it("represents every current Settings modal tab exactly once", () => {
    const mappedIds = settingsExperienceMap.map((entry) => entry.id);

    expect(unique(mappedIds)).toEqual(mappedIds);
    expect(mappedIds).toEqual(expectedSettingsTabIds);
  });

  it("keeps the destinations the merge retired out of the map", () => {
    const mappedIds = settingsExperienceMap.map((entry) => entry.id);

    for (const retired of [
      "vision",
      "profile",
      "mcp-bridge",
      "connectors",
      "iot",
      "knowledge-bridge",
      "about",
    ]) {
      expect(mappedIds).not.toContain(retired);
    }
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
        "model-manager",
        "personality",
        "autonomy",
        "lucalink",
        "integrations",
        "data",
      ]),
    );
    expect(settingsSensitiveTabIds).not.toContain("appearance");
  });

  it("identifies advanced, tactical, and origin follow-up candidates", () => {
    expect(settingsAdvancedFeatureCandidateTabIds).toEqual([
      "model-manager",
      "integrations",
    ]);
    expect(settingsTacticalModeCandidateTabIds).toEqual(["autonomy"]);
    expect(settingsOriginModeCandidateTabIds).toEqual([]);
  });

  it("keeps Integrations a tactical/advanced mobile surface", () => {
    const integrations = settingsExperienceMap.find(
      (entry) => entry.id === "integrations",
    );

    expect(integrations?.availability).toEqual(["desktop", "mobile"]);
    expect(integrations?.futurePlacement).toBe("advanced-features");
    expect(integrations?.primaryExperience).toBe("tactical-user");
    expect(integrations?.classificationLabels).toEqual(
      expect.arrayContaining([
        "tactical-user",
        "advanced-feature",
        "privacy-sensitive",
        "permission-sensitive",
        "runtime-sensitive",
        "needs-product-language-review",
        "needs-mobile-layout-review",
      ]),
    );
  });

  // A merge must not thin out what it absorbed. MCP Bridge, Connectors, and
  // Smart Home each carried their own security classification; Integrations
  // has to carry all three, or the merge quietly downgraded the surface.
  it("carries the full union of the three merged surfaces' classification", () => {
    const integrations = settingsExperienceMap.find(
      (entry) => entry.id === "integrations",
    );

    expect(integrations?.classificationLabels).toContain("device-sensitive");
    expect(integrations?.sensitiveCapabilityImplications).toEqual(
      expect.arrayContaining([
        // mcp-bridge
        "tool import/export",
        "filesystem and GitHub access",
        "messaging or database MCP servers",
        "custom command execution configuration",
        // connectors
        "social account access",
        "workspace account access",
        "browser automation",
        "session persistence",
        "messaging and content surfaces",
        // iot
        "smart-home device access",
        "Home Assistant long-lived token",
        "local network endpoint configuration",
      ]),
    );
  });

  it("keeps the absorbed surfaces' sensitive capabilities on their new hosts", () => {
    const byId = new Map(
      settingsExperienceMap.map((entry) => [entry.id, entry]),
    );

    // vision → brain
    expect(byId.get("brain")?.sensitiveCapabilityImplications).toEqual(
      expect.arrayContaining(["camera or image analysis", "vision model routing"]),
    );
    expect(byId.get("brain")?.classificationLabels).toContain("model-sensitive");

    // profile → personality
    expect(byId.get("personality")?.sensitiveCapabilityImplications).toEqual(
      expect.arrayContaining([
        "operator identity profile",
        "behavioral pattern insights",
        "reference image or identity lock data",
      ]),
    );
    expect(byId.get("personality")?.classificationLabels).toContain(
      "privacy-sensitive",
    );

    // knowledge-bridge → data
    expect(byId.get("data")?.sensitiveCapabilityImplications).toEqual(
      expect.arrayContaining([
        "file import",
        "SaaS knowledge sync",
        "workspace document indexing",
        "developer context ingestion",
      ]),
    );

    // about → general (display-only, but it still has to be accounted for)
    expect(byId.get("general")?.classificationLabels).toContain(
      "safe-display-only",
    );
  });

  it("relabels the model tab to Models", () => {
    const models = settingsExperienceMap.find(
      (entry) => entry.id === "model-manager",
    );

    expect(models?.currentLabel).toBe("Models");
  });
});
