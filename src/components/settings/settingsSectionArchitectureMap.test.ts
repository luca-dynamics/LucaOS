import { describe, expect, it } from "vitest";
import {
  settingsBenchmarkGapSectionIds,
  settingsOriginCandidateSectionIds,
  settingsSectionArchitectureAuditNote,
  settingsSectionArchitectureMap,
  settingsSectionClassificationLabels,
  settingsSectionTabIds,
  settingsSensitiveSectionIds,
} from "./settingsSectionArchitectureMap";

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

describe("settingsSectionArchitectureMap", () => {
  it("maps at least one internal section for every current Settings tab", () => {
    expect(settingsSectionTabIds).toEqual(expectedSettingsTabIds);

    for (const tabId of expectedSettingsTabIds) {
      expect(
        settingsSectionArchitectureMap.some((entry) => entry.tabId === tabId),
        tabId,
      ).toBe(true);
    }
  });

  it("assigns supported classification labels to every section", () => {
    const supportedLabels = new Set(settingsSectionClassificationLabels);

    for (const entry of settingsSectionArchitectureMap) {
      expect(
        entry.classificationLabels.length,
        entry.sectionId,
      ).toBeGreaterThan(0);
      for (const label of entry.classificationLabels) {
        expect(
          supportedLabels.has(label),
          `${entry.tabId}:${entry.sectionId}:${label}`,
        ).toBe(true);
      }
    }
  });

  it("records placement, integration, benchmark, and recommendation assessments", () => {
    for (const entry of settingsSectionArchitectureMap) {
      expect(entry.placementAssessment, entry.sectionId).toBeTruthy();
      expect(entry.integrationAssessment, entry.sectionId).toBeTruthy();
      expect(entry.benchmarkComparison, entry.sectionId).toBeTruthy();
      expect(entry.recommendedFutureAction, entry.sectionId).toBeTruthy();
    }
  });

  it("represents benchmark gaps and benchmark-aligned sections", () => {
    expect(settingsBenchmarkGapSectionIds.length).toBeGreaterThan(0);
    expect(
      settingsSectionArchitectureMap.some((entry) =>
        entry.classificationLabels.includes("benchmark-aligned"),
      ),
    ).toBe(true);
  });

  it("marks sensitive sections across embodied AI OS surfaces", () => {
    expect(settingsSensitiveSectionIds).toEqual(
      expect.arrayContaining([
        "general:privacy-awareness",
        "brain:cloud-api-config",
        "voice:voice-cloning-studio",
        "vision:vision-engine",
        "autonomy:mission-control",
        "lucalink:desktop-server-pairing",
        "mcp-bridge:connect-tool-servers",
        "iot:home-assistant-connection",
        "connectors:connected-accounts",
        "data:memory-explorer",
        "knowledge-bridge:saas-sync",
      ]),
    );
  });

  it("keeps Origin/Creator Dashboard future-only and not implemented as a tab", () => {
    expect(settingsSectionTabIds).not.toEqual(
      expect.arrayContaining(["origin", "creator-dashboard"]),
    );
    expect(settingsOriginCandidateSectionIds).toEqual(
      expect.arrayContaining([
        "personality:unified-consciousness",
        "personality:archetype-blueprint",
        "mcp-bridge:share-luca-capabilities",
      ]),
    );
    expect(settingsSectionArchitectureAuditNote).toContain("future-only");
  });
});
