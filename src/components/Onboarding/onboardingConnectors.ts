/**
 * onboardingConnectors — the catalog of tool apps Luca can connect to.
 *
 * Pure data, mirroring the connector lists modern AI assistants present
 * (Gmail, Calendar, Slack, Drive, GitHub, Notion, …). The onboarding
 * "Connect now" path renders these as expandable cards so people can see
 * exactly what each integration would let Luca do BEFORE anything connects.
 *
 * Boundary discipline: this file authors no behavior. Choosing a connector in
 * onboarding only records intent for later review in Settings — no OAuth, no
 * token, no tool access is granted here. The `scopes` strings describe what a
 * connection would allow once the user approves it in Settings.
 */

export type OnboardingConnectorCategoryId =
  | "communication"
  | "productivity"
  | "files"
  | "developer";

export interface OnboardingConnector {
  /** Stable id (used for selection hooks + later Settings matching). */
  id: string;
  /** Display name of the tool app. */
  name: string;
  /** One-line description of what connecting unlocks. */
  tagline: string;
  /** Category bucket for grouping. */
  category: OnboardingConnectorCategoryId;
  /** Brand accent (badge background) — kept muted to suit the Quiet Machine. */
  brandColor: string;
  /** Short monogram shown in the badge when no brand glyph is available. */
  monogram: string;
  /** What Luca would be able to do once the user approves the connection. */
  scopes: string[];
  /** Marks the connectors most people start with (sorted first, lightly hinted). */
  popular?: boolean;
}

export interface OnboardingConnectorCategory {
  id: OnboardingConnectorCategoryId;
  /** Section label. */
  title: string;
  /** Lucide icon name for the section header. */
  icon: string;
}

export const ONBOARDING_CONNECTOR_CATEGORIES: OnboardingConnectorCategory[] = [
  { id: "communication", title: "Communication", icon: "Mail" },
  { id: "productivity", title: "Calendar & productivity", icon: "Calendar" },
  { id: "files", title: "Files & storage", icon: "FolderOpen" },
  { id: "developer", title: "Developer", icon: "Code" },
];

/**
 * The connector catalog. Brand colors are intentionally desaturated so the
 * badges sit calmly inside any skin instead of shouting.
 */
export const ONBOARDING_CONNECTORS: OnboardingConnector[] = [
  // Communication
  {
    id: "gmail",
    name: "Gmail",
    tagline: "Read, draft, and triage email when you ask.",
    category: "communication",
    brandColor: "#ea4335",
    monogram: "M",
    popular: true,
    scopes: [
      "Search and read messages you reference",
      "Draft and send replies after you confirm",
      "Summarize threads and find attachments",
    ],
  },
  {
    id: "outlook",
    name: "Outlook",
    tagline: "Work with Microsoft mail and contacts.",
    category: "communication",
    brandColor: "#0a66c2",
    monogram: "O",
    scopes: [
      "Search and read messages you reference",
      "Draft replies and schedule sends after you confirm",
    ],
  },
  {
    id: "slack",
    name: "Slack",
    tagline: "Catch up on channels and post on your behalf.",
    category: "communication",
    brandColor: "#611f69",
    monogram: "S",
    popular: true,
    scopes: [
      "Read channels and DMs you point Luca to",
      "Draft and post messages after you confirm",
      "Summarize unread activity",
    ],
  },

  // Calendar & productivity
  {
    id: "google_calendar",
    name: "Google Calendar",
    tagline: "See your schedule and propose meetings.",
    category: "productivity",
    brandColor: "#1a73e8",
    monogram: "C",
    popular: true,
    scopes: [
      "Read your upcoming events",
      "Create or update events after you confirm",
      "Find open time across calendars",
    ],
  },
  {
    id: "notion",
    name: "Notion",
    tagline: "Search pages and capture notes into your workspace.",
    category: "productivity",
    brandColor: "#2f2f2f",
    monogram: "N",
    popular: true,
    scopes: [
      "Search pages and databases you share",
      "Create and update pages after you confirm",
    ],
  },
  {
    id: "linear",
    name: "Linear",
    tagline: "Track issues and create them from chat.",
    category: "productivity",
    brandColor: "#5e6ad2",
    monogram: "L",
    scopes: [
      "Read issues and projects you have access to",
      "Create and update issues after you confirm",
    ],
  },
  {
    id: "asana",
    name: "Asana",
    tagline: "Review tasks and keep projects moving.",
    category: "productivity",
    brandColor: "#f06a6a",
    monogram: "A",
    scopes: [
      "Read tasks and projects you share",
      "Create and update tasks after you confirm",
    ],
  },

  // Files & storage
  {
    id: "google_drive",
    name: "Google Drive",
    tagline: "Find files and pull context from your docs.",
    category: "files",
    brandColor: "#1fa463",
    monogram: "D",
    popular: true,
    scopes: [
      "Search files you point Luca to",
      "Read documents to answer questions",
      "Create or edit files after you confirm",
    ],
  },
  {
    id: "onedrive",
    name: "OneDrive",
    tagline: "Reach files across your Microsoft account.",
    category: "files",
    brandColor: "#0a66c2",
    monogram: "1",
    scopes: [
      "Search and read files you reference",
      "Save new files after you confirm",
    ],
  },
  {
    id: "dropbox",
    name: "Dropbox",
    tagline: "Search and read from your Dropbox.",
    category: "files",
    brandColor: "#0061ff",
    monogram: "D",
    scopes: [
      "Search files you point Luca to",
      "Read documents to answer questions",
    ],
  },

  // Developer
  {
    id: "github",
    name: "GitHub",
    tagline: "Read repos, issues, and open pull requests.",
    category: "developer",
    brandColor: "#2b3137",
    monogram: "G",
    popular: true,
    scopes: [
      "Read repositories you grant access to",
      "Read and comment on issues and pull requests",
      "Open branches and pull requests after you confirm",
    ],
  },
  {
    id: "jira",
    name: "Jira",
    tagline: "See tickets and update them from chat.",
    category: "developer",
    brandColor: "#0a66c2",
    monogram: "J",
    scopes: [
      "Read issues and boards you have access to",
      "Create and update issues after you confirm",
    ],
  },
];

/** Connectors for a given category, popular ones first. */
export const getOnboardingConnectorsByCategory = (
  category: OnboardingConnectorCategoryId,
): OnboardingConnector[] =>
  ONBOARDING_CONNECTORS.filter((c) => c.category === category).sort(
    (a, b) => Number(Boolean(b.popular)) - Number(Boolean(a.popular)),
  );
