/**
 * connectorCatalog — the single source of truth for the tool/app connectors
 * Luca can work with.
 *
 * First-party connectors mirror exactly what the Settings → Connected Apps tab
 * supports (real OAuth / LucaLink flows + real logo assets in
 * `public/icons/social`). Their `id` matches a key in `settings.connectors`, so
 * a selection made anywhere (Settings or onboarding) maps to the same
 * connection state. Both `SettingsConnectorsTab` and the onboarding connector
 * grid read from this list, so the two never drift apart.
 *
 * MCP-registry connectors (the extensible "app plugin" layer) are fetched at
 * runtime from `/api/mcp/registry` and mapped into the same shape — see
 * `mapMcpRegistryEntry`. They are additive: when the registry is unreachable
 * (first run, offline, web with no backend), only the first-party list shows.
 */

export type ConnectorCategory =
  | "productivity"
  | "communication"
  | "social"
  | "developer";

export interface ConnectorCatalogEntry {
  /** First-party: matches a `settings.connectors` key. MCP: the server id. */
  id: string;
  name: string;
  /** Local logo asset (first-party). Preferred over `iconUrl`/`monogram`. */
  logo?: string;
  /** Remote icon URL (MCP registry entries). */
  iconUrl?: string;
  /** Letter fallback when no logo/iconUrl is available. */
  monogram?: string;
  /** Brand color — badge background for the monogram fallback. */
  color: string;
  /** Short description; doubles as the Settings `desc` and onboarding tagline. */
  desc: string;
  category: ConnectorCategory;
  source: "first-party" | "mcp";
  /** LucaLink event used by Settings; null for OAuth-only flows (e.g. Google). */
  event?: string | null;
  /** Surfaced first in onboarding. */
  popular?: boolean;
}

/**
 * The first-party catalog. This is the same data the Settings connectors tab
 * renders (id / name / logo / desc / event are consumed there) — enriched with
 * `category` + `popular` for the onboarding grid. Keep it in sync with the
 * `settings.connectors` keys and the assets in `public/icons/social`.
 */
export const FIRST_PARTY_CONNECTORS: ConnectorCatalogEntry[] = [
  {
    id: "google",
    name: "Google Workspace",
    logo: "/icons/social/google.png",
    color: "#FFFFFF",
    desc: "Gmail, Drive & Calendar",
    category: "productivity",
    source: "first-party",
    event: null,
    popular: true,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    logo: "/icons/social/linkedin.png",
    color: "#0A66C2",
    desc: "Professional workspace",
    category: "productivity",
    source: "first-party",
    event: "LINKEDIN_LUCA_LINK",
    popular: true,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    logo: "/icons/social/whatsapp.png",
    color: "#25D366",
    desc: "Instant messaging & calls",
    category: "communication",
    source: "first-party",
    event: "WHATSAPP_LUCA_LINK",
    popular: true,
  },
  {
    id: "telegram",
    name: "Telegram",
    logo: "/icons/social/telegram.png",
    color: "#0088CC",
    desc: "Private messaging surface",
    category: "communication",
    source: "first-party",
    event: "TELEGRAM_LUCA_LINK",
  },
  {
    id: "discord",
    name: "Discord",
    logo: "/icons/social/discord.png",
    color: "#5865F2",
    desc: "Groups & voice channels",
    category: "communication",
    source: "first-party",
    event: "DISCORD_LUCA_LINK",
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    logo: "/icons/social/twitter.png",
    color: "#000000",
    desc: "Real-time feed & discovery",
    category: "social",
    source: "first-party",
    event: "TWITTER_LUCA_LINK",
  },
  {
    id: "instagram",
    name: "Instagram",
    logo: "/icons/social/instagram.png",
    color: "#E1306C",
    desc: "Media & social presence",
    category: "social",
    source: "first-party",
    event: "INSTAGRAM_LUCA_LINK",
  },
  {
    id: "youtube",
    name: "YouTube",
    logo: "/icons/social/youtube.png",
    color: "#FF0000",
    desc: "Video content & streaming",
    category: "social",
    source: "first-party",
    event: "YOUTUBE_LUCA_LINK",
  },
  {
    id: "wechat",
    name: "WeChat",
    logo: "/icons/social/wechat.png",
    color: "#07C060",
    desc: "Global social network",
    category: "social",
    source: "first-party",
    event: "WECHAT_LUCA_LINK",
  },
];

/** First letter of a name, used as a monogram fallback for logoless entries. */
const monogramFor = (name: string): string =>
  (name.trim()[0] || "?").toUpperCase();

/**
 * Map one `/api/mcp/registry` server record into a catalog entry. Mirrors the
 * mapping in `directory/ConnectorsTab` so onboarding and the marketplace agree.
 * Returns null for records without a usable name.
 */
export function mapMcpRegistryEntry(raw: any): ConnectorCatalogEntry | null {
  const server = raw?.server ?? raw;
  const rawName: string | undefined = server?.title || server?.name;
  if (!rawName) return null;
  const name = rawName.split("/").pop() || rawName;
  const palette = [
    "#6366f1",
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#8b5cf6",
    "#14b8a6",
  ];
  const hash = name
    .split("")
    .reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
  return {
    id: server?.name || name,
    name,
    iconUrl: server?.icons?.[0]?.src,
    monogram: monogramFor(name),
    color: palette[hash % palette.length],
    desc: server?.description || "Marketplace connector",
    category: "developer",
    source: "mcp",
  };
}
