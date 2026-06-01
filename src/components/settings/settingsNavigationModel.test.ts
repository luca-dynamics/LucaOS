import { describe, expect, it } from "vitest";
import {
  isMobileAdvancedSettingsTab,
  mobileAdvancedSettingsTabs,
  mobileAvailableAdvancedSettingsTabs,
  mobileSettingsNavigationTabs,
  mobileStandardSettingsTabs,
  settingsAdvancedGroup,
  settingsDesktopTabs,
} from "./settingsNavigationModel";
import {
  settingsExperienceMap,
  settingsOriginModeCandidateTabIds,
} from "./settingsExperienceMap";

const expectedDesktopTabIds = [
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

const expectedMobileStandardTabIds = [
  "general",
  "brain",
  "voice",
  "vision",
  "personality",
  "profile",
  "lucalink",
  "data",
  "knowledge-bridge",
  "about",
];

const expectedMobileAdvancedTabIds = [
  "model-manager",
  "autonomy",
  "mcp-bridge",
  "iot",
  "connectors",
];

const ids = (tabs: readonly { id: string }[]) => tabs.map((tab) => tab.id);

describe("settingsNavigationModel", () => {
  it("keeps desktop Settings tabs fully visible in current audit order", () => {
    expect(ids(settingsDesktopTabs)).toEqual(expectedDesktopTabIds);
  });

  it("represents standard mobile Settings tabs directly", () => {
    expect(ids(mobileStandardSettingsTabs)).toEqual(
      expectedMobileStandardTabIds,
    );
  });

  it("adds an Advanced Settings group to mobile navigation", () => {
    expect(settingsAdvancedGroup).toMatchObject({
      id: "advanced-settings",
      label: "Advanced Settings",
    });
    expect(ids(mobileSettingsNavigationTabs)).toEqual([
      ...expectedMobileStandardTabIds,
      "advanced-settings",
    ]);
  });

  it("represents all mobile tactical and advanced tabs inside Advanced Settings", () => {
    expect(ids(mobileAdvancedSettingsTabs)).toEqual(
      expectedMobileAdvancedTabIds,
    );
    expect(ids(mobileAvailableAdvancedSettingsTabs)).toEqual(
      expectedMobileAdvancedTabIds,
    );
  });

  it("classifies MCP Bridge as tactical/advanced, not Origin-only", () => {
    const mcpBridge = settingsExperienceMap.find(
      (entry) => entry.id === "mcp-bridge",
    );

    expect(mcpBridge?.primaryExperience).toBe("tactical-user");
    expect(mcpBridge?.futurePlacement).toBe("advanced-features");
    expect(mcpBridge?.availability).toEqual(["desktop", "mobile"]);
    expect(isMobileAdvancedSettingsTab("mcp-bridge")).toBe(true);
    expect(settingsOriginModeCandidateTabIds).not.toContain("mcp-bridge");
  });

  it("classifies Connectors as tactical/advanced, not Origin-only", () => {
    const connectors = settingsExperienceMap.find(
      (entry) => entry.id === "connectors",
    );

    expect(connectors?.primaryExperience).toBe("tactical-user");
    expect(connectors?.futurePlacement).toBe("advanced-features");
    expect(connectors?.availability).toEqual(["desktop", "mobile"]);
    expect(isMobileAdvancedSettingsTab("connectors")).toBe(true);
    expect(settingsOriginModeCandidateTabIds).not.toContain("connectors");
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
