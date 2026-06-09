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
    showAdvancedTools: false,
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

const ADVANCED_LEFT_PANEL_GROUPS: readonly DashboardLeftPanelGroup[] = [
  "advanced-tools",
  "runtime-diagnostics",
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

/**
 * Phase 1 contract only: core apps, devices, and skills remain available in all
 * modes. Advanced groups are ready for future collapse/de-emphasis, but App does
 * not enforce this left-panel policy yet.
 */
export function shouldShowLeftPanelGroup(
  mode: LucaExperienceMode,
  groupId: DashboardLeftPanelGroup,
): boolean {
  return (
    !ADVANCED_LEFT_PANEL_GROUPS.includes(groupId) ||
    !shouldCollapseAdvancedLeftPanelGroups(mode)
  );
}
