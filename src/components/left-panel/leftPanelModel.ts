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
  | "agents"
  | "tools"
  | "memory"
  | "connections"
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

/** Which experience tier a tool belongs to. Basic hides pro-only tools. */
export type ToolTier = "basic" | "pro";

/** A launcher tool rendered as a clickable button. */
export interface LeftPanelToolItem {
  id: string;
  label: string;
  group: ToolGroupId;
  icon: string;
  actionKey: LeftPanelToolActionKey;
  risk?: ToolRiskLevel;
  /** Experience tier this tool requires. Omitted means "basic". */
  tier?: ToolTier;
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
 * Ordered group metadata — the SPACES of the being (design target
 * dashboard-being.html): Agents, Tools, Memory, Devices (its own rail
 * section), Connections. Order here is the render order. Agents stays open;
 * every other space rests as a single quiet row until opened.
 */
export const LEFT_PANEL_TOOL_GROUPS: readonly ToolGroupMeta[] = [
  {
    id: "agents",
    label: "Agents",
    description: "What Luca can do — skills and training.",
    defaultExpanded: true,
  },
  { id: "tools", label: "Tools", defaultExpanded: false },
  { id: "memory", label: "Memory", defaultExpanded: false },
  { id: "connections", label: "Connections", defaultExpanded: false },
  { id: "installed", label: "Installed", defaultExpanded: false },
] as const;

/**
 * Every launcher in the rail. These map 1:1 to the callbacks that previously
 * lived inline in OperationsSidebar — no entry points are added or removed.
 */
export const LEFT_PANEL_TOOLS: readonly LeftPanelToolItem[] = [
  // Agents — what Luca can do
  { id: "skills", label: "Skills", group: "agents", icon: "MagicStick", actionKey: "openSkills" },
  { id: "apps", label: "Apps", group: "tools", icon: "Widget", actionKey: "openApps" },
  { id: "screen", label: "Screen", group: "tools", icon: "Monitor", actionKey: "openScreen", description: "Visual core capture (Electron only)." },
  { id: "import", label: "Import", group: "memory", icon: "Import", actionKey: "openImport" },
  { id: "ide", label: "IDE", group: "tools", icon: "Programming", actionKey: "openIde" },
  { id: "system-services", label: "System Services", group: "tools", icon: "Pulse", actionKey: "openSystemServices", tier: "pro" },
  { id: "link-bridge", label: "Link Bridge", group: "connections", icon: "Smartphone", actionKey: "openLinkBridge" },

  // Tools — operational suite (Pro): intelligence, security, finance, previews
  { id: "security", label: "Ethical Hacking", group: "tools", icon: "Shield", actionKey: "openSecurity", risk: "elevated", tier: "pro", accentColor: "#ef4444", description: "Opens the ethical hacking terminal." },
  { id: "reports", label: "Reports", group: "tools", icon: "Notes", actionKey: "openReports", tier: "pro" },
  { id: "osint", label: "OSINT", group: "tools", icon: "Search", actionKey: "openOsint", tier: "pro" },
  { id: "dark-web", label: "Dark Web", group: "tools", icon: "Shield", actionKey: "openDarkWeb", tier: "pro" },
  { id: "train", label: "Train", group: "agents", icon: "EyeScan", actionKey: "openTrain" },

  { id: "defi", label: "DeFi", group: "tools", icon: "Wallet", actionKey: "openDeFi", tier: "pro" },
  { id: "fx", label: "FX", group: "tools", icon: "Bank", actionKey: "openForex", tier: "pro" },
  { id: "stock-feed", label: "Stock Feed", group: "tools", icon: "Chart", actionKey: "openStockFeed", tier: "pro" },
  { id: "ai-trading", label: "AI Trading", group: "tools", icon: "MagicStick", actionKey: "openAiTrading", tier: "pro" },
  { id: "prediction", label: "Prediction", group: "tools", icon: "Chart", actionKey: "openPrediction", tier: "pro" },

  { id: "sovereignty", label: "Sovereignty", group: "tools", icon: "Earth", actionKey: "previewSovereignty", preview: true, tier: "pro", description: "Visual preview — sample data only." },
  { id: "security-preview", label: "Security", group: "tools", icon: "Shield", actionKey: "previewSecurity", preview: true, tier: "pro", description: "Visual preview — sample data only." },
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
export interface BuildToolLauncherGroupsOptions {
  /** When false, pro-tier tools are hidden (Basic experience). Defaults to true. */
  includeProTools?: boolean;
}

export function buildToolLauncherGroups(
  installedModules: ReadonlyArray<string> = [],
  options: BuildToolLauncherGroupsOptions = {},
): LeftPanelToolGroup[] {
  const includeProTools = options.includeProTools ?? true;
  const moduleItems = installedModules
    .filter((mod) => typeof mod === "string" && mod.trim().length > 0)
    .map((mod, index) => toModuleItem(mod, index));

  return LEFT_PANEL_TOOL_GROUPS.map((meta) => {
    const tools = LEFT_PANEL_TOOLS.filter(
      (tool) =>
        tool.group === meta.id &&
        (includeProTools || (tool.tier ?? "basic") !== "pro"),
    );
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
