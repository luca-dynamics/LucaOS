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

// Nine, not ten: this audit map predates the Appearance tab and has never
// carried a section for it. The seven destinations the 16 → 10 merge retired
// kept their audit rows and were re-pointed at the tab that absorbed them.
const expectedSettingsTabIds = [
  "general",
  "brain",
  "voice",
  "model-manager",
  "personality",
  "autonomy",
  "lucalink",
  "integrations",
  "data",
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
        "brain:vision-engine",
        "autonomy:mission-control",
        "lucalink:desktop-server-pairing",
        "integrations:connect-tool-servers",
        "integrations:home-assistant-connection",
        "integrations:connected-accounts",
        "data:memory-explorer",
        "data:saas-sync",
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
        "integrations:share-luca-capabilities",
      ]),
    );
    expect(settingsSectionArchitectureAuditNote).toContain("future-only");
  });

  // The merge moved sections between destinations; it did not delete audit rows.
  // Every sensitive section that belonged to a retired tab must now be attributed
  // to the tab that absorbed it, or the census silently lost a surface.
  it("re-points retired destinations instead of dropping their sections", () => {
    for (const retired of [
      "vision",
      "profile",
      "mcp-bridge",
      "iot",
      "connectors",
      "knowledge-bridge",
      "about",
    ]) {
      expect(settingsSectionTabIds).not.toContain(retired);
      expect(
        settingsSensitiveSectionIds.some((id) => id.startsWith(`${retired}:`)),
        retired,
      ).toBe(false);
    }

    const absorbed = {
      brain: ["vision-engine", "vision-tips"],
      personality: ["identity-card", "partnership-status", "assistant-directives"],
      integrations: [
        "connect-tool-servers",
        "connected-accounts",
        "home-assistant-connection",
      ],
      data: ["local-knowledge-import", "saas-sync"],
      general: ["system-identity-status", "labs-branding"],
    };

    for (const [tabId, sectionIds] of Object.entries(absorbed)) {
      for (const sectionId of sectionIds) {
        expect(
          settingsSectionArchitectureMap.some(
            (entry) => entry.tabId === tabId && entry.sectionId === sectionId,
          ),
          `${tabId}:${sectionId}`,
        ).toBe(true);
      }
    }
  });
});
