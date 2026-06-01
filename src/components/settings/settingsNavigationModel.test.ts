import { describe, expect, it } from "vitest";
import {
  advancedFeatureTabIds,
  isMobileAdvancedSettingsTab,
  mobileAdvancedSettingsTabs,
  mobileAvailableAdvancedSettingsTabs,
  mobileSettingsNavigationTabs,
  mobileStandardSettingsTabs,
  settingsAdvancedFeatureTabs,
  settingsAdvancedGroup,
  settingsDesktopTabs,
  settingsNavigationGroups,
  settingsStandardTabs,
  standardSettingsTabIds,
} from "./settingsNavigationModel";
import {
  settingsExperienceMap,
  settingsOriginModeCandidateTabIds,
} from "./settingsExperienceMap";

const expectedStandardTabIds = [
  "general",
  "brain",
  "voice",
  "vision",
  "personality",
  "profile",
  "data",
  "knowledge-bridge",
  "lucalink",
  "about",
];

const expectedAdvancedTabIds = [
  "model-manager",
  "mcp-bridge",
  "connectors",
  "iot",
  "autonomy",
];

const expectedAllTabIds = [
  ...expectedStandardTabIds,
  ...expectedAdvancedTabIds,
];
const ids = (tabs: readonly { id: string }[]) => tabs.map((tab) => tab.id);

describe("settingsNavigationModel", () => {
  it("keeps all 15 Settings tabs represented exactly once", () => {
    expect(ids(settingsDesktopTabs)).toEqual(expectedAllTabIds);
    expect(new Set(ids(settingsDesktopTabs)).size).toBe(15);
  });

  it("groups desktop Settings into Standard Settings and Advanced Features", () => {
    expect(standardSettingsTabIds).toEqual(expectedStandardTabIds);
    expect(advancedFeatureTabIds).toEqual(expectedAdvancedTabIds);
    expect(ids(settingsStandardTabs)).toEqual(expectedStandardTabIds);
    expect(ids(settingsAdvancedFeatureTabs)).toEqual(expectedAdvancedTabIds);
    expect(settingsNavigationGroups).toHaveLength(2);
    expect(settingsNavigationGroups[0]).toMatchObject({
      id: "standard-settings",
      label: "Standard Settings",
    });
    expect(ids(settingsNavigationGroups[0].tabs)).toEqual(
      expectedStandardTabIds,
    );
    expect(settingsNavigationGroups[1]).toMatchObject({
      id: "advanced-features",
      label: "Advanced Features",
    });
    expect(ids(settingsNavigationGroups[1].tabs)).toEqual(
      expectedAdvancedTabIds,
    );
  });

  it("adds an Advanced Settings group to mobile navigation", () => {
    expect(settingsAdvancedGroup).toMatchObject({
      id: "advanced-settings",
      label: "Advanced Settings",
    });
    expect(ids(mobileStandardSettingsTabs)).toEqual(expectedStandardTabIds);
    expect(ids(mobileSettingsNavigationTabs)).toEqual([
      ...expectedStandardTabIds,
      "advanced-settings",
    ]);
  });

  it("represents every advanced feature tab inside mobile Advanced Settings", () => {
    expect(ids(mobileAdvancedSettingsTabs)).toEqual(expectedAdvancedTabIds);
    expect(ids(mobileAvailableAdvancedSettingsTabs)).toEqual(
      expectedAdvancedTabIds,
    );
    expect(ids(mobileAdvancedSettingsTabs)).toEqual([...advancedFeatureTabIds]);
    expect(ids(mobileAdvancedSettingsTabs)).toEqual(
      expect.arrayContaining([
        "model-manager",
        "mcp-bridge",
        "connectors",
        "iot",
        "autonomy",
      ]),
    );
  });

  it("classifies MCP Bridge and Connectors as available advanced features, not Origin-only", () => {
    for (const id of ["mcp-bridge", "connectors"] as const) {
      const entry = settingsExperienceMap.find((item) => item.id === id);

      expect(entry?.primaryExperience).toBe("tactical-user");
      expect(entry?.futurePlacement).toBe("advanced-features");
      expect(entry?.availability).toEqual(["desktop", "mobile"]);
      expect(isMobileAdvancedSettingsTab(id)).toBe(true);
      expect(settingsOriginModeCandidateTabIds).not.toContain(id);
      expect(ids(settingsDesktopTabs)).toContain(id);
      expect(ids(mobileAdvancedSettingsTabs)).toContain(id);
      expect(ids(mobileSettingsNavigationTabs)).not.toContain(id);
    }
  });

  it("does not introduce an Origin or Creator Dashboard tab", () => {
    expect(ids(settingsDesktopTabs)).not.toEqual(
      expect.arrayContaining(["origin", "creator-dashboard"]),
    );
    expect(ids(mobileSettingsNavigationTabs)).not.toEqual(
      expect.arrayContaining(["origin", "creator-dashboard"]),
    );
    expect(settingsOriginModeCandidateTabIds).toEqual([]);
  });
});
