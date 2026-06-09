import type { LucaExperienceMode } from "./experienceMode";

/** Stable internal right-panel modes. Disclosure changes labels/visibility only. */
export type DashboardRightPanelMode =
  | "CONTROL"
  | "ACTIVITY"
  | "MEMORY"
  | "LOGS";

/** Contract-only left-panel groups for phased disclosure work. */
export type DashboardLeftPanelGroup =
  | "apps"
  | "devices"
  | "skills"
  | "quick-actions"
  | "system-health"
  | "advanced-tools"
  | "runtime-diagnostics";

export interface DashboardDisclosure {
  visibleRightPanelModes: readonly DashboardRightPanelMode[];
  showAdvancedDiagnostics: boolean;
  showCreatorDiagnostics: boolean;
  showAdvancedTools: boolean;
  showTraceByDefault: boolean;
  collapseAdvancedLeftPanelGroups: boolean;
}

const BASIC_RIGHT_PANEL_MODES: readonly DashboardRightPanelMode[] = [
  "CONTROL",
  "ACTIVITY",
  "MEMORY",
];

const FULL_RIGHT_PANEL_MODES: readonly DashboardRightPanelMode[] = [
  ...BASIC_RIGHT_PANEL_MODES,
  "LOGS",
];

const DISCLOSURE_BY_MODE: Record<LucaExperienceMode, DashboardDisclosure> = {
  basic: {
    visibleRightPanelModes: BASIC_RIGHT_PANEL_MODES,
    showAdvancedDiagnostics: false,
    showCreatorDiagnostics: false,
    showAdvancedTools: true,
    showTraceByDefault: false,
    collapseAdvancedLeftPanelGroups: true,
  },
  pro: {
    visibleRightPanelModes: FULL_RIGHT_PANEL_MODES,
    showAdvancedDiagnostics: true,
    showCreatorDiagnostics: false,
    showAdvancedTools: true,
    showTraceByDefault: true,
    collapseAdvancedLeftPanelGroups: false,
  },
  creator: {
    visibleRightPanelModes: FULL_RIGHT_PANEL_MODES,
    showAdvancedDiagnostics: true,
    showCreatorDiagnostics: true,
    showAdvancedTools: true,
    showTraceByDefault: true,
    collapseAdvancedLeftPanelGroups: false,
  },
};

const RIGHT_PANEL_LABELS: Record<DashboardRightPanelMode, string> = {
  CONTROL: "Overview",
  ACTIVITY: "Timeline",
  MEMORY: "Memory",
  LOGS: "Trace",
};

const CORE_LEFT_PANEL_GROUPS: readonly DashboardLeftPanelGroup[] = [
  "quick-actions",
  "devices",
  "apps",
  "skills",
  "system-health",
];

const ADVANCED_LEFT_PANEL_GROUPS: readonly DashboardLeftPanelGroup[] = [
  "advanced-tools",
  "runtime-diagnostics",
];

const FULL_LEFT_PANEL_GROUPS: readonly DashboardLeftPanelGroup[] = [
  "system-health",
  "runtime-diagnostics",
  "quick-actions",
  "devices",
  "apps",
  "skills",
  "advanced-tools",
];

const BASIC_LEFT_PANEL_GROUPS: readonly DashboardLeftPanelGroup[] = [
  ...CORE_LEFT_PANEL_GROUPS,
  "advanced-tools",
];

export function getDashboardDisclosure(
  mode: LucaExperienceMode,
): DashboardDisclosure {
  return DISCLOSURE_BY_MODE[mode];
}

export function getVisibleRightPanelModes(
  mode: LucaExperienceMode,
): readonly DashboardRightPanelMode[] {
  return getDashboardDisclosure(mode).visibleRightPanelModes;
}

export function canShowRightPanelMode(
  mode: LucaExperienceMode,
  panelMode: DashboardRightPanelMode,
): boolean {
  return getVisibleRightPanelModes(mode).includes(panelMode);
}

export function getRightPanelLabelForMode(
  _mode: LucaExperienceMode,
  panelMode: DashboardRightPanelMode,
): string {
  return RIGHT_PANEL_LABELS[panelMode];
}

export function getDefaultRightPanelModeForExperience(
  mode: LucaExperienceMode,
  requestedMode: DashboardRightPanelMode,
): DashboardRightPanelMode {
  return canShowRightPanelMode(mode, requestedMode) ? requestedMode : "CONTROL";
}

export function shouldShowAdvancedDiagnostics(
  mode: LucaExperienceMode,
): boolean {
  return getDashboardDisclosure(mode).showAdvancedDiagnostics;
}

export function shouldShowCreatorDiagnostics(
  mode: LucaExperienceMode,
): boolean {
  return getDashboardDisclosure(mode).showCreatorDiagnostics;
}

export function shouldShowAdvancedTools(mode: LucaExperienceMode): boolean {
  return getDashboardDisclosure(mode).showAdvancedTools;
}

export function shouldShowTraceByDefault(mode: LucaExperienceMode): boolean {
  return getDashboardDisclosure(mode).showTraceByDefault;
}

export function shouldCollapseAdvancedLeftPanelGroups(
  mode: LucaExperienceMode,
): boolean {
  return getDashboardDisclosure(mode).collapseAdvancedLeftPanelGroups;
}

/** Whether a left-panel group is an operational/diagnostic surface. */
export function isAdvancedLeftPanelGroup(
  groupId: DashboardLeftPanelGroup,
): boolean {
  return ADVANCED_LEFT_PANEL_GROUPS.includes(groupId);
}

/**
 * Ordered logical groups for the current mode. Basic keeps common actions first,
 * moves health lower, and omits only the clearly diagnostic runtime surface.
 * Tool capabilities remain mounted through the Apps/Skills/advanced launcher.
 */
export function getVisibleLeftPanelGroups(
  mode: LucaExperienceMode,
): readonly DashboardLeftPanelGroup[] {
  return mode === "basic" ? BASIC_LEFT_PANEL_GROUPS : FULL_LEFT_PANEL_GROUPS;
}

export function shouldShowLeftPanelGroup(
  mode: LucaExperienceMode,
  groupId: DashboardLeftPanelGroup,
): boolean {
  return getVisibleLeftPanelGroups(mode).includes(groupId);
}

export function shouldCollapseLeftPanelGroup(
  mode: LucaExperienceMode,
  groupId: DashboardLeftPanelGroup,
): boolean {
  return (
    shouldShowLeftPanelGroup(mode, groupId) &&
    isAdvancedLeftPanelGroup(groupId) &&
    shouldCollapseAdvancedLeftPanelGroups(mode)
  );
}
