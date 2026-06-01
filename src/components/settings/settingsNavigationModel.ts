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

export interface SettingsNavigationGroupDefinition {
  id: "standard-settings" | "advanced-features";
  label: "Standard Settings" | "Advanced Features";
  description: string;
  tabs: SettingsTabDefinition[];
}

export interface SettingsAdvancedGroupDefinition {
  id: "advanced-settings";
  label: "Advanced Settings";
  icon: "Sliders";
  description: string;
  availabilityNote: string;
}

export const standardSettingsTabIds = [
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
] as const;

export const advancedFeatureTabIds = [
  "model-manager",
  "mcp-bridge",
  "connectors",
  "iot",
  "autonomy",
] as const;

type SettingsTabId = (typeof settingsExperienceMap)[number]["id"];

const byId = new Map<SettingsTabId, (typeof settingsExperienceMap)[number]>(
  settingsExperienceMap.map((entry) => [entry.id, entry]),
);

const tabFromId = (id: SettingsTabId): SettingsTabDefinition => {
  const entry = byId.get(id);
  if (!entry) throw new Error(`Unknown Settings tab id: ${id}`);
  return {
    id: entry.id,
    label: entry.currentLabel,
    icon: entry.icon,
    platforms: [...entry.availability],
  };
};

export const settingsAdvancedGroup: SettingsAdvancedGroupDefinition = {
  id: "advanced-settings",
  label: "Advanced Settings",
  icon: "Sliders",
  description:
    "Advanced tools for model management, integrations, devices, and autonomy.",
  availabilityNote:
    "These features remain available on mobile, grouped here to keep everyday Settings clear.",
};

export const settingsStandardTabs: SettingsTabDefinition[] =
  standardSettingsTabIds.map(tabFromId);

export const settingsAdvancedFeatureTabs: SettingsTabDefinition[] =
  advancedFeatureTabIds.map(tabFromId);

export const settingsNavigationGroups: SettingsNavigationGroupDefinition[] = [
  {
    id: "standard-settings",
    label: "Standard Settings",
    description: "Everyday Luca preferences and personal configuration.",
    tabs: settingsStandardTabs,
  },
  {
    id: "advanced-features",
    label: "Advanced Features",
    description:
      "Power-user model, integration, device, and autonomy controls.",
    tabs: settingsAdvancedFeatureTabs,
  },
];

export const settingsDesktopTabs: SettingsTabDefinition[] = [
  ...settingsStandardTabs,
  ...settingsAdvancedFeatureTabs,
];

export const mobileStandardSettingsTabs: SettingsTabDefinition[] =
  settingsStandardTabs.filter((tab) => tab.platforms.includes("mobile"));

// Advanced features are intentionally exposed from the mobile Advanced Settings
// entry even when an older audit availability flag has not yet marked the tab
// as mobile-primary. They remain grouped under Advanced Settings and are not
// promoted into the standard mobile rail.
export const mobileAdvancedSettingsTabs: SettingsTabDefinition[] =
  settingsAdvancedFeatureTabs;

export const mobileAvailableAdvancedSettingsTabs = mobileAdvancedSettingsTabs;

export const mobileSettingsNavigationTabs: Array<
  SettingsTabDefinition | SettingsAdvancedGroupDefinition
> = [...mobileStandardSettingsTabs, settingsAdvancedGroup];

export const isSettingsTabAvailableOnPlatform = (
  tab: SettingsTabDefinition,
  platform: SettingsPlatform,
) => tab.platforms.includes(platform);

export const isMobileAdvancedSettingsTab = (tabId: string) =>
  mobileAdvancedSettingsTabs.some((tab) => tab.id === tabId);
