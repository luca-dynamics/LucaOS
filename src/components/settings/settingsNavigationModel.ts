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
  id: "core-settings" | "intelligence" | "advanced-features";
  label: "General" | "Intelligence" | "Advanced";
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

export const generalSettingsTabIds = [
  "general",
  "appearance",
  "voice",
  "lucalink",
] as const;

export const intelligenceSettingsTabIds = [
  "brain",
  "model-manager",
  "personality",
  "data",
] as const;

export const advancedFeatureTabIds = ["integrations", "autonomy"] as const;

/** Everything outside Advanced — the mobile rail's flat list. */
export const standardSettingsTabIds = [
  ...generalSettingsTabIds,
  ...intelligenceSettingsTabIds,
] as const;

type SettingsTabId = (typeof settingsExperienceMap)[number]["id"];

const byId = new Map<SettingsTabId, (typeof settingsExperienceMap)[number]>(
  settingsExperienceMap.map((entry) => [entry.id, entry]),
);

/**
 * Destinations that were merged away, mapped to where their controls now live.
 * `mcp` was never a tab id at all: two chat-input dispatch sites shipped it and
 * opened Settings on a blank pane. Aliases are the safety net, not the contract —
 * call sites should pass live ids.
 */
const retiredSettingsTabAliases = {
  vision: "brain",
  profile: "personality",
  "knowledge-bridge": "data",
  about: "general",
  "mcp-bridge": "integrations",
  connectors: "integrations",
  iot: "integrations",
  mcp: "integrations",
} as const satisfies Record<string, SettingsTabId>;

export const settingsTabAliases: Readonly<Record<string, SettingsTabId>> =
  retiredSettingsTabAliases;

/** Resolve any historic, merged-away, or unknown tab id to one that renders. */
export const resolveSettingsTabId = (id?: string | null): SettingsTabId => {
  if (!id) return "general";
  if (byId.has(id as SettingsTabId)) return id as SettingsTabId;
  return (
    retiredSettingsTabAliases[id as keyof typeof retiredSettingsTabAliases] ??
    "general"
  );
};

/**
 * The `data-settings-anchor` to scroll to when a retired id was requested, so a
 * deep link to a merged pane lands on its group instead of the top of a long one.
 */
export const settingsTabAnchorForId = (
  id?: string | null,
): string | undefined =>
  id && id in retiredSettingsTabAliases ? id : undefined;

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
    "Advanced tools for outside connections, devices, and autonomy.",
  availabilityNote:
    "These features remain available on mobile, grouped here to keep everyday Settings clear.",
};

export const settingsGeneralGroupTabs: SettingsTabDefinition[] =
  generalSettingsTabIds.map(tabFromId);

export const settingsIntelligenceTabs: SettingsTabDefinition[] =
  intelligenceSettingsTabIds.map(tabFromId);

export const settingsStandardTabs: SettingsTabDefinition[] = [
  ...settingsGeneralGroupTabs,
  ...settingsIntelligenceTabs,
];

export const settingsAdvancedFeatureTabs: SettingsTabDefinition[] =
  advancedFeatureTabIds.map(tabFromId);

export const settingsNavigationGroups: SettingsNavigationGroupDefinition[] = [
  {
    id: "core-settings",
    label: "General",
    description: "Everyday Luca preferences and personal configuration.",
    tabs: settingsGeneralGroupTabs,
  },
  {
    id: "intelligence",
    label: "Intelligence",
    description: "How Luca thinks, who Luca is, and what Luca remembers.",
    tabs: settingsIntelligenceTabs,
  },
  {
    id: "advanced-features",
    label: "Advanced",
    description: "Outside connections, devices, and autonomy.",
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
