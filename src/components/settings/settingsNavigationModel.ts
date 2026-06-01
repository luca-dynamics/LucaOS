import {
  settingsExperienceMap,
  type SettingsAvailability,
} from "./settingsExperienceMap";

export type SettingsPlatform = SettingsAvailability;

export interface SettingsTabDefinition {
  id: string;
  label: string;
  icon: string;
  platforms: SettingsPlatform[];
}

export interface SettingsAdvancedGroupDefinition {
  id: "advanced-settings";
  label: "Advanced Settings";
  icon: "Sliders";
  description: string;
  availabilityNote: string;
}

export const settingsAdvancedGroup: SettingsAdvancedGroupDefinition = {
  id: "advanced-settings",
  label: "Advanced Settings",
  icon: "Sliders",
  description:
    "Advanced tools and controls for models, autonomy, devices, and integrations.",
  availabilityNote: "Some advanced settings may be available on desktop only.",
};

export const settingsDesktopTabs: SettingsTabDefinition[] =
  settingsExperienceMap.map((entry) => ({
    id: entry.id,
    label: entry.currentLabel,
    icon: entry.icon,
    platforms: [...entry.availability],
  }));

export const mobileStandardSettingsTabs: SettingsTabDefinition[] =
  settingsDesktopTabs.filter((tab) => {
    const mapEntry = settingsExperienceMap.find((entry) => entry.id === tab.id);

    return (
      tab.platforms.includes("mobile") &&
      mapEntry?.futurePlacement === "top-level-everyone"
    );
  });

export const mobileAdvancedSettingsTabs: SettingsTabDefinition[] =
  settingsDesktopTabs.filter((tab) => {
    const mapEntry = settingsExperienceMap.find((entry) => entry.id === tab.id);

    return ["advanced-features", "tactical-mode"].includes(
      mapEntry?.futurePlacement ?? "",
    );
  });

export const mobileAvailableAdvancedSettingsTabs =
  mobileAdvancedSettingsTabs.filter((tab) => tab.platforms.includes("mobile"));

export const mobileDesktopOnlyAdvancedSettingsTabs =
  mobileAdvancedSettingsTabs.filter(
    (tab) =>
      !tab.platforms.includes("mobile") && tab.platforms.includes("desktop"),
  );

export const mobileSettingsNavigationTabs: Array<
  SettingsTabDefinition | SettingsAdvancedGroupDefinition
> = [...mobileStandardSettingsTabs, settingsAdvancedGroup];

export const isSettingsTabAvailableOnPlatform = (
  tab: SettingsTabDefinition,
  platform: SettingsPlatform,
) => tab.platforms.includes(platform);

export const isMobileAdvancedSettingsTab = (tabId: string) =>
  mobileAdvancedSettingsTabs.some((tab) => tab.id === tabId);
