// Left Panel "System & Tools Rail" data model.
//
// This module holds the pure, render-free metadata that describes the TOOLS
// section of the left OperationsSidebar. Keeping it isolated lets the sidebar
// stay mostly orchestration and lets us cover the grouping logic with cheap
// unit tests (no DOM / component deps required).
//
// IMPORTANT: nothing here executes a tool. Each item only references an
// `actionKey`; the actual callback lives in the sidebar and only runs on a
// real button click.

export type ToolGroupId =
  | "core"
  | "vision"
  | "finance"
  | "visual"
  | "installed";

export type ToolRiskLevel = "safe" | "elevated";

/**
 * Stable union of every left-panel tool action. The sidebar maps each key to
 * an existing launcher callback. Adding a launcher means adding a key here and
 * wiring it in the sidebar's callback map.
 */
export type LeftPanelToolActionKey =
  | "openSkills"
  | "openApps"
  | "openScreen"
  | "openImport"
  | "openIde"
  | "openSystemServices"
  | "openLinkBridge"
  | "openSecurity"
  | "openReports"
  | "openOsint"
  | "openDarkWeb"
  | "openTrain"
  | "openDeFi"
  | "openForex"
  | "openStockFeed"
  | "openAiTrading"
  | "openPrediction"
  | "previewSovereignty"
  | "previewSecurity";

/** A launcher tool rendered as a clickable button. */
export interface LeftPanelToolItem {
  id: string;
  label: string;
  group: ToolGroupId;
  icon: string;
  actionKey: LeftPanelToolActionKey;
  risk?: ToolRiskLevel;
  description?: string;
  /** Visual/preview modules only inject sample UI data, never live data. */
  preview?: boolean;
  /** Optional accent colour for elevated/risk items (existing red accents). */
  accentColor?: string;
}

/** An installed module rendered as a non-interactive chip. */
export interface LeftPanelModuleItem {
  id: string;
  label: string;
  group: "installed";
  icon: string;
}

export interface LeftPanelToolGroup {
  id: ToolGroupId;
  label: string;
  description?: string;
  tools: LeftPanelToolItem[];
  modules: LeftPanelModuleItem[];
  defaultExpanded: boolean;
}

interface ToolGroupMeta {
  id: ToolGroupId;
  label: string;
  description?: string;
  defaultExpanded: boolean;
}

/**
 * Ordered group metadata. Order here is the render order in the TOOLS section.
 * Defaults follow the matured rail: Core open, everything else collapsed so
 * mobile stays compact.
 */
export const LEFT_PANEL_TOOL_GROUPS: readonly ToolGroupMeta[] = [
  { id: "core", label: "Core", defaultExpanded: true },
  { id: "vision", label: "Intelligence", defaultExpanded: false },
  { id: "finance", label: "Finance", defaultExpanded: false },
  {
    id: "visual",
    label: "Visual Modules",
    description: "Preview only — sample data, not live telemetry.",
    defaultExpanded: false,
  },
  { id: "installed", label: "Installed Modules", defaultExpanded: false },
] as const;

/**
 * Every launcher in the rail. These map 1:1 to the callbacks that previously
 * lived inline in OperationsSidebar — no entry points are added or removed.
 */
export const LEFT_PANEL_TOOLS: readonly LeftPanelToolItem[] = [
  // Core
  { id: "skills", label: "Skills", group: "core", icon: "MagicStick", actionKey: "openSkills" },
  { id: "apps", label: "Apps", group: "core", icon: "Widget", actionKey: "openApps" },
  { id: "screen", label: "Screen", group: "core", icon: "Monitor", actionKey: "openScreen", description: "Visual core capture (Electron only)." },
  { id: "import", label: "Import", group: "core", icon: "Import", actionKey: "openImport" },
  { id: "ide", label: "IDE", group: "core", icon: "Programming", actionKey: "openIde" },
  { id: "system-services", label: "System Services", group: "core", icon: "Pulse", actionKey: "openSystemServices" },
  { id: "link-bridge", label: "Link Bridge", group: "core", icon: "Smartphone", actionKey: "openLinkBridge" },

  // Vision & Knowledge
  { id: "security", label: "Ethical Hacking", group: "vision", icon: "Shield", actionKey: "openSecurity", risk: "elevated", accentColor: "#ef4444", description: "Opens the ethical hacking terminal." },
  { id: "reports", label: "Reports", group: "vision", icon: "Notes", actionKey: "openReports" },
  { id: "osint", label: "OSINT", group: "vision", icon: "Search", actionKey: "openOsint" },
  { id: "dark-web", label: "Dark Web", group: "vision", icon: "Shield", actionKey: "openDarkWeb" },
  { id: "train", label: "Train", group: "vision", icon: "EyeScan", actionKey: "openTrain" },

  // Finance
  { id: "defi", label: "DeFi", group: "finance", icon: "Wallet", actionKey: "openDeFi" },
  { id: "fx", label: "FX", group: "finance", icon: "Bank", actionKey: "openForex" },
  { id: "stock-feed", label: "Stock Feed", group: "finance", icon: "Chart", actionKey: "openStockFeed" },
  { id: "ai-trading", label: "AI Trading", group: "finance", icon: "MagicStick", actionKey: "openAiTrading" },
  { id: "prediction", label: "Prediction", group: "finance", icon: "Chart", actionKey: "openPrediction" },

  // Visual Modules (preview / sample data only)
  { id: "sovereignty", label: "Sovereignty", group: "visual", icon: "Earth", actionKey: "previewSovereignty", preview: true, description: "Visual preview — sample data only." },
  { id: "security-preview", label: "Security", group: "visual", icon: "Shield", actionKey: "previewSecurity", preview: true, description: "Visual preview — sample data only." },
] as const;

/** Default expand/collapse state keyed by group id. */
export function getDefaultExpandedGroups(): Record<ToolGroupId, boolean> {
  return LEFT_PANEL_TOOL_GROUPS.reduce(
    (acc, group) => {
      acc[group.id] = group.defaultExpanded;
      return acc;
    },
    {} as Record<ToolGroupId, boolean>,
  );
}

function toModuleItem(label: string, index: number): LeftPanelModuleItem {
  return {
    id: `installed-module-${index}`,
    label,
    group: "installed",
    icon: "Import",
  };
}

/**
 * Build the ordered, grouped tool model for rendering. Installed modules are
 * appended into the "installed" group. Groups with no content are dropped so
 * the rail never shows an empty header.
 */
export function buildToolLauncherGroups(
  installedModules: ReadonlyArray<string> = [],
): LeftPanelToolGroup[] {
  const moduleItems = installedModules
    .filter((mod) => typeof mod === "string" && mod.trim().length > 0)
    .map((mod, index) => toModuleItem(mod, index));

  return LEFT_PANEL_TOOL_GROUPS.map((meta) => {
    const tools = LEFT_PANEL_TOOLS.filter((tool) => tool.group === meta.id);
    const modules = meta.id === "installed" ? moduleItems : [];
    return {
      id: meta.id,
      label: meta.label,
      description: meta.description,
      tools,
      modules,
      defaultExpanded: meta.defaultExpanded,
    };
  }).filter((group) => group.tools.length > 0 || group.modules.length > 0);
}

/** Preview/visual modules that only inject sample UI data. */
export function getPreviewTools(): LeftPanelToolItem[] {
  return LEFT_PANEL_TOOLS.filter((tool) => tool.preview === true);
}

/** Above this many devices the DEVICES grid collapses by default. */
export const DEVICE_COLLAPSE_THRESHOLD = 4;

/**
 * Whether the DEVICES section should start collapsed: only when the list is
 * long enough to crowd the rail. Short lists stay expanded.
 */
export function shouldCollapseDevicesByDefault(deviceCount: number): boolean {
  return deviceCount > DEVICE_COLLAPSE_THRESHOLD;
}
