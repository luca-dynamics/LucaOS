import { describe, expect, it } from "vitest";
import {
  advancedFeatureTabIds,
  generalSettingsTabIds,
  intelligenceSettingsTabIds,
  isMobileAdvancedSettingsTab,
  mobileAdvancedSettingsTabs,
  mobileAvailableAdvancedSettingsTabs,
  mobileSettingsNavigationTabs,
  mobileStandardSettingsTabs,
  resolveSettingsTabId,
  settingsAdvancedFeatureTabs,
  settingsAdvancedGroup,
  settingsDesktopTabs,
  settingsNavigationGroups,
  settingsStandardTabs,
  settingsTabAliases,
  settingsTabAnchorForId,
  standardSettingsTabIds,
} from "./settingsNavigationModel";
import {
  settingsExperienceMap,
  settingsOriginModeCandidateTabIds,
} from "./settingsExperienceMap";

const expectedGeneralTabIds = ["general", "appearance", "voice", "lucalink"];

const expectedIntelligenceTabIds = [
  "brain",
  "model-manager",
  "personality",
  "data",
];

const expectedAdvancedTabIds = ["integrations", "autonomy"];

const expectedStandardTabIds = [
  ...expectedGeneralTabIds,
  ...expectedIntelligenceTabIds,
];

const expectedAllTabIds = [
  ...expectedStandardTabIds,
  ...expectedAdvancedTabIds,
];
const ids = (tabs: readonly { id: string }[]) => tabs.map((tab) => tab.id);

describe("settingsNavigationModel", () => {
  it("keeps all 10 Settings tabs represented exactly once", () => {
    expect(ids(settingsDesktopTabs)).toEqual(expectedAllTabIds);
    expect(new Set(ids(settingsDesktopTabs)).size).toBe(10);
  });

  it("groups desktop Settings into General, Intelligence, and Advanced", () => {
    expect(generalSettingsTabIds).toEqual(expectedGeneralTabIds);
    expect(intelligenceSettingsTabIds).toEqual(expectedIntelligenceTabIds);
    expect(advancedFeatureTabIds).toEqual(expectedAdvancedTabIds);
    expect(standardSettingsTabIds).toEqual(expectedStandardTabIds);
    expect(ids(settingsStandardTabs)).toEqual(expectedStandardTabIds);
    expect(ids(settingsAdvancedFeatureTabs)).toEqual(expectedAdvancedTabIds);
    expect(settingsNavigationGroups).toHaveLength(3);
    expect(settingsNavigationGroups[0]).toMatchObject({
      id: "core-settings",
      label: "General",
    });
    expect(ids(settingsNavigationGroups[0].tabs)).toEqual(
      expectedGeneralTabIds,
    );
    expect(settingsNavigationGroups[1]).toMatchObject({
      id: "intelligence",
      label: "Intelligence",
    });
    expect(ids(settingsNavigationGroups[1].tabs)).toEqual(
      expectedIntelligenceTabIds,
    );
    expect(settingsNavigationGroups[2]).toMatchObject({
      id: "advanced-features",
      label: "Advanced",
    });
    expect(ids(settingsNavigationGroups[2].tabs)).toEqual(
      expectedAdvancedTabIds,
    );
  });

  it("relabels the model tab to Models", () => {
    const models = settingsDesktopTabs.find(
      (tab) => tab.id === "model-manager",
    );

    expect(models?.label).toBe("Models");
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
      expect.arrayContaining(["integrations", "autonomy"]),
    );
  });

  it("classifies Integrations as an available advanced feature, not Origin-only", () => {
    const entry = settingsExperienceMap.find(
      (item) => item.id === "integrations",
    );

    expect(entry?.primaryExperience).toBe("tactical-user");
    expect(entry?.futurePlacement).toBe("advanced-features");
    expect(entry?.availability).toEqual(["desktop", "mobile"]);
    expect(isMobileAdvancedSettingsTab("integrations")).toBe(true);
    expect(settingsOriginModeCandidateTabIds).not.toContain("integrations");
    expect(ids(settingsDesktopTabs)).toContain("integrations");
    expect(ids(mobileAdvancedSettingsTabs)).toContain("integrations");
    expect(ids(mobileSettingsNavigationTabs)).not.toContain("integrations");
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

  // The merge retired seven destinations, and menus, services, and the chat
  // input still dispatch their ids. An unresolved id renders no pane at all.
  it("resolves every retired tab id to a destination that still exists", () => {
    const merged = {
      vision: "brain",
      profile: "personality",
      "knowledge-bridge": "data",
      about: "general",
      "mcp-bridge": "integrations",
      connectors: "integrations",
      iot: "integrations",
    };

    for (const [retired, live] of Object.entries(merged)) {
      expect(ids(settingsDesktopTabs)).not.toContain(retired);
      expect(resolveSettingsTabId(retired)).toBe(live);
      expect(ids(settingsDesktopTabs)).toContain(live);
      expect(settingsTabAliases[retired]).toBe(live);
    }
  });

  it("resolves the mcp id the chat input shipped, which never existed as a tab", () => {
    expect(ids(settingsDesktopTabs)).not.toContain("mcp");
    expect(resolveSettingsTabId("mcp")).toBe("integrations");
  });

  it("passes live tab ids through untouched and falls back to General", () => {
    for (const id of expectedAllTabIds) {
      expect(resolveSettingsTabId(id)).toBe(id);
    }
    expect(resolveSettingsTabId(undefined)).toBe("general");
    expect(resolveSettingsTabId("")).toBe("general");
    expect(resolveSettingsTabId("not-a-tab")).toBe("general");
  });

  it("anchors a retired id so a deep link lands on the group that absorbed it", () => {
    expect(settingsTabAnchorForId("about")).toBe("about");
    expect(settingsTabAnchorForId("knowledge-bridge")).toBe("knowledge-bridge");
    expect(settingsTabAnchorForId("general")).toBeUndefined();
    expect(settingsTabAnchorForId(undefined)).toBeUndefined();
  });
});
