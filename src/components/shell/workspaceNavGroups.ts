/**
 * workspaceNavGroups — the 21 surfaces Luca can open, as data.
 *
 * These used to be an inline literal inside `App.tsx`'s JSX: four nested object
 * arrays, 21 items, every glyph and hint spelled out between a `groups={[` and a
 * `]}`. Nothing could read them but React, so "how many surfaces are there" and
 * "is anything double-listed" were questions you answered by scrolling.
 *
 * The catalogue is now flat and each surface names its own group, so grouping is
 * a property of the surface rather than a shape of the file. `handlers` is a
 * total `Record` on purpose: adding a surface here without wiring it in `App.tsx`
 * is a type error, not a dead row that looks alive until someone clicks it.
 *
 * What this module does NOT decide is where a surface is SEEN. The sidebar shows
 * only what is pinned or actually running; everything else lives in the tools
 * surface behind `All tools…`. Relocated, never deleted.
 */

export type WorkspaceSurfaceId =
  | "cognitive"
  | "reports"
  | "autonomy"
  | "lucalink"
  | "browser"
  | "files"
  | "code"
  | "skills"
  | "agent"
  | "hacking"
  | "osint"
  | "darkweb"
  | "network"
  | "geo"
  | "stock"
  | "crypto"
  | "fx"
  | "prediction"
  | "aitrading"
  | "screen"
  | "subsystems";

export type WorkspaceNavGroupId =
  | "intelligence"
  | "connections"
  | "tools"
  | "advanced";

export interface WorkspaceSurfaceDefinition {
  id: WorkspaceSurfaceId;
  /** One word wherever possible. The hint may be a sentence; the row may not. */
  label: string;
  glyph: string;
  hint: string;
  group: WorkspaceNavGroupId;
  /**
   * Kept in the sidebar at rest, even when nothing is running. Three, because
   * the rail's budget is six primary items and the other three are New, All
   * tools… and Settings.
   */
  pinned?: boolean;
}

/** Every surface, once. Order within a group is the order it renders. */
export const WORKSPACE_SURFACES: readonly WorkspaceSurfaceDefinition[] = [
  // ── Intelligence ──────────────────────────────────────────────────────────
  {
    id: "cognitive",
    label: "Cognitive",
    glyph: "❋",
    hint: "Watch Luca's cognitive engine think",
    group: "intelligence",
  },
  {
    id: "reports",
    label: "Reports",
    glyph: "❑",
    hint: "Investigation reports",
    group: "intelligence",
  },
  {
    id: "autonomy",
    label: "Autonomy",
    glyph: "◈",
    hint: "Autonomy dashboard",
    group: "intelligence",
  },

  // ── Connections ───────────────────────────────────────────────────────────
  {
    id: "lucalink",
    label: "LucaLink",
    glyph: "⇄",
    hint: "Link and hand off to other devices",
    group: "connections",
  },

  // ── Tools ─────────────────────────────────────────────────────────────────
  {
    id: "browser",
    label: "Browser",
    glyph: "◎",
    hint: "Open the ghost browser",
    group: "tools",
    pinned: true,
  },
  {
    id: "files",
    label: "Files",
    glyph: "▤",
    hint: "Browse apps and files",
    group: "tools",
    pinned: true,
  },
  {
    id: "code",
    label: "Code",
    glyph: "⌗",
    hint: "Open the code editor",
    group: "tools",
    pinned: true,
  },
  {
    id: "skills",
    label: "Skills",
    glyph: "◇",
    hint: "Skills matrix",
    group: "tools",
  },

  // ── Advanced (operator tier) ──────────────────────────────────────────────
  {
    id: "agent",
    label: "Agent",
    glyph: "⬡",
    hint: "Autonomous agent mode",
    group: "advanced",
  },
  {
    id: "hacking",
    label: "Hacking",
    glyph: "⌁",
    hint: "Offensive security terminal",
    group: "advanced",
  },
  {
    id: "osint",
    label: "OSINT",
    glyph: "◉",
    hint: "Open-source intelligence",
    group: "advanced",
  },
  {
    id: "darkweb",
    label: "Dark web",
    glyph: "◍",
    hint: "Dark web scanner",
    group: "advanced",
  },
  {
    id: "network",
    label: "Network",
    glyph: "⌘",
    hint: "Network map",
    group: "advanced",
  },
  {
    id: "geo",
    label: "Geo",
    glyph: "⊕",
    hint: "Geo-tactical view",
    group: "advanced",
  },
  {
    id: "stock",
    label: "Stocks",
    glyph: "▦",
    hint: "Stock terminal",
    group: "advanced",
  },
  {
    id: "crypto",
    label: "Crypto",
    glyph: "◊",
    hint: "Crypto / DeFi terminal",
    group: "advanced",
  },
  {
    id: "fx",
    label: "FX",
    glyph: "⇋",
    hint: "Forex terminal",
    group: "advanced",
  },
  {
    id: "prediction",
    label: "Prediction",
    glyph: "◔",
    hint: "Prediction markets",
    group: "advanced",
  },
  {
    id: "aitrading",
    label: "AI traders",
    glyph: "◧",
    hint: "AI trading desk",
    group: "advanced",
  },
  {
    id: "screen",
    label: "Screen",
    glyph: "▷",
    hint: "Screen recorder",
    group: "advanced",
  },
  {
    id: "subsystems",
    label: "Systems",
    glyph: "▤",
    hint: "Subsystem dashboard",
    group: "advanced",
  },
];

export interface WorkspaceNavGroupDefinition {
  id: WorkspaceNavGroupId;
  label: string;
  /** Operator tier: shown only where `shouldShowAdvancedTools` allows it. */
  advanced?: boolean;
}

/** Group order, and which of them is the operator tier. */
export const WORKSPACE_NAV_GROUPS: readonly WorkspaceNavGroupDefinition[] = [
  { id: "intelligence", label: "Intelligence" },
  { id: "connections", label: "Connections" },
  { id: "tools", label: "Tools" },
  { id: "advanced", label: "Advanced", advanced: true },
];

/**
 * One handler per surface. Total by design — see the module note. `App.tsx` owns
 * the `setShowX` state, so it owns this map; nothing here may guess at it.
 */
export type WorkspaceSurfaceHandlers = Record<WorkspaceSurfaceId, () => void>;

/** Which surfaces are open right now. Absent means "not running". */
export type WorkspaceSurfaceActivity = Partial<
  Record<WorkspaceSurfaceId, boolean>
>;

export interface WorkspaceToolLink {
  id: WorkspaceSurfaceId;
  label: string;
  glyph: string;
  hint?: string;
  /** Optional trailing count (e.g. pending items on that surface). */
  count?: number;
  /** Stays in the sidebar at rest. */
  pinned?: boolean;
  /** Open right now — the only thing that earns a tone dot. */
  running?: boolean;
  onOpen: () => void;
}

export interface WorkspaceNavGroup {
  id: WorkspaceNavGroupId;
  label: string;
  advanced?: boolean;
  items: WorkspaceToolLink[];
}

/**
 * Bind the catalogue to real handlers. Pure — same inputs, same groups — so the
 * shape can be asserted in a test instead of clicked through in the app.
 */
export function buildWorkspaceNavGroups(
  handlers: WorkspaceSurfaceHandlers,
  activity: WorkspaceSurfaceActivity = {},
): WorkspaceNavGroup[] {
  return WORKSPACE_NAV_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    ...(group.advanced ? { advanced: true } : {}),
    items: WORKSPACE_SURFACES.filter(
      (surface) => surface.group === group.id,
    ).map((surface) => ({
      id: surface.id,
      label: surface.label,
      glyph: surface.glyph,
      hint: surface.hint,
      ...(surface.pinned ? { pinned: true } : {}),
      ...(activity[surface.id] ? { running: true } : {}),
      onOpen: handlers[surface.id],
    })),
  })).filter((group) => group.items.length > 0);
}

/**
 * What the sidebar shows at rest: running first, then pinned, capped. Anything
 * cut is still one click away under `All tools…`, which is the whole point of
 * having a cap — a rail that lists everything is a rail nobody reads.
 */
export const SIDEBAR_TOOL_ROW_LIMIT = 4;

export function selectSidebarToolRows(
  groups: WorkspaceNavGroup[],
  limit: number = SIDEBAR_TOOL_ROW_LIMIT,
): WorkspaceToolLink[] {
  const items = groups.flatMap((group) => group.items);
  const running = items.filter((item) => item.running);
  // A pinned tool that is already running must not appear twice.
  const pinned = items.filter((item) => item.pinned && !item.running);
  return [...running, ...pinned].slice(0, Math.max(0, limit));
}
