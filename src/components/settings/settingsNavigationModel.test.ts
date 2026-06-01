import { describe, expect, it } from "vitest";
import {
  isMobileAdvancedSettingsTab,
  mobileAdvancedSettingsTabs,
  mobileAvailableAdvancedSettingsTabs,
  mobileDesktopOnlyAdvancedSettingsTabs,
  mobileSettingsNavigationTabs,
  mobileStandardSettingsTabs,
  settingsAdvancedGroup,
  settingsDesktopTabs,
} from "./settingsNavigationModel";
import {
  settingsExperienceMap,
  settingsOriginModeCandidateTabIds,
} from "./settingsExperienceMap";

const ids = (tabs: readonly { id: string }[]) => tabs.map((tab) => tab.id);

describe("settingsNavigationModel", () => {
  it("keeps desktop Settings tabs fully visible in current audit order", () => {
    expect(ids(settingsDesktopTabs)).toEqual(
      settingsExperienceMap.map((entry) => entry.id),
    );
  });

  it("represents standard mobile Settings tabs directly", () => {
    expect(ids(mobileStandardSettingsTabs)).toEqual([
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
    ]);
  });

  it("adds an Advanced Settings group to mobile navigation", () => {
    expect(settingsAdvancedGroup).toMatchObject({
      id: "advanced-settings",
      label: "Advanced Settings",
    });
    expect(ids(mobileSettingsNavigationTabs)).toEqual([
      ...ids(mobileStandardSettingsTabs),
      "advanced-settings",
    ]);
  });

  it("represents mobile-available tactical and advanced tabs inside Advanced Settings", () => {
    expect(ids(mobileAdvancedSettingsTabs)).toEqual([
      "model-manager",
      "autonomy",
      "mcp-bridge",
      "iot",
      "connectors",
    ]);
    expect(ids(mobileAvailableAdvancedSettingsTabs)).toEqual([
      "model-manager",
      "autonomy",
      "iot",
    ]);
  });

  it("keeps desktop-only advanced tabs classified without forcing mobile rendering", () => {
    expect(ids(mobileDesktopOnlyAdvancedSettingsTabs)).toEqual([
      "mcp-bridge",
      "connectors",
    ]);
  });

  it("classifies MCP Bridge as tactical/advanced, not Origin-only", () => {
    const mcpBridge = settingsExperienceMap.find(
      (entry) => entry.id === "mcp-bridge",
    );

    expect(mcpBridge?.primaryExperience).toBe("tactical-user");
    expect(mcpBridge?.futurePlacement).toBe("advanced-features");
    expect(isMobileAdvancedSettingsTab("mcp-bridge")).toBe(true);
    expect(settingsOriginModeCandidateTabIds).not.toContain("mcp-bridge");
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
