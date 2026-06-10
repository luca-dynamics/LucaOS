export type MarketplaceCategory =
  | "General"
  | "Productivity"
  | "Development"
  | "Research"
  | "Automation"
  | "Data"
  | "Media"
  | "Security"
  | "Files"
  | "Dev"
  | "Social"
  | "Search"
  | "Cloud"
  | "Other";

export interface MarketplaceSkillInput {
  name: string;
  type: "string" | "number" | "boolean" | "json" | "file";
  label?: string;
  description?: string;
  required?: boolean;
  defaultValue?: unknown;
}

export interface MarketplaceSkill {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: MarketplaceCategory | string;
  language: string;
  author: string;
  version: string;
  inputs: MarketplaceSkillInput[];
  code: string;
  isVerified?: boolean;
  isPopular?: boolean;
}

export interface MarketplaceServer {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconUrl?: string;
  type: "stdio" | "sse";
  command?: string;
  args?: string | string[];
  url?: string;
  category: "Files" | "Dev" | "Social" | "Search" | "Cloud" | "Other";
  color: string;
  isLive?: boolean;
}

export interface MarketplacePlugin {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: MarketplaceCategory | string;
  color: string;
  skills: string[];
  connectors: string[];
}

export const MARKETPLACE_CATEGORIES = [
  "All",
  "General",
  "Productivity",
  "Development",
  "Research",
  "Automation",
  "Data",
  "Media",
  "Security",
] as const;

export const CURATED_SKILLS: MarketplaceSkill[] = [
  {
    id: "research-brief",
    name: "Research Brief",
    description: "Collect sources and draft a concise operator-ready research brief.",
    icon: "🔎",
    category: "Research",
    language: "node",
    author: "LucaOS",
    version: "1.0.0",
    inputs: [{ name: "topic", type: "string", label: "Topic", required: true }],
    code: "// Installed through the LucaOS hosted skill API when available.",
    isVerified: true,
    isPopular: true,
  },
  {
    id: "workspace-summarizer",
    name: "Workspace Summarizer",
    description: "Summarize a project folder or working session into next actions.",
    icon: "📁",
    category: "Productivity",
    language: "node",
    author: "LucaOS",
    version: "1.0.0",
    inputs: [{ name: "scope", type: "string", label: "Scope" }],
    code: "// Installed through the LucaOS hosted skill API when available.",
    isVerified: true,
  },
  {
    id: "incident-triage",
    name: "Incident Triage",
    description: "Structure logs, symptoms, and hypotheses into a response checklist.",
    icon: "🛡️",
    category: "Security",
    language: "node",
    author: "LucaOS",
    version: "1.0.0",
    inputs: [{ name: "notes", type: "string", label: "Incident notes", required: true }],
    code: "// Installed through the LucaOS hosted skill API when available.",
    isVerified: true,
  },
];

export const CURATED_CONNECTORS: MarketplaceServer[] = [
  {
    id: "filesystem",
    name: "Filesystem",
    description: "Read, write, and browse approved local directories through desktop MCP.",
    icon: "Folder",
    type: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-filesystem",
    category: "Files",
    color: "#3b82f6",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Work with repositories, issues, pull requests, and code search.",
    icon: "Code",
    type: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-github",
    category: "Dev",
    color: "#8b5cf6",
  },
  {
    id: "web-search",
    name: "Web Search",
    description: "Route web research through a configured search MCP connector.",
    icon: "Search",
    type: "stdio",
    command: "npx",
    args: "-y @modelcontextprotocol/server-tavily-search",
    category: "Search",
    color: "#f59e0b",
  },
];

export const CURATED_PLUGINS: MarketplacePlugin[] = [
  {
    id: "research-ops",
    name: "Research Ops",
    description: "Briefing, source review, and web research workflows for planning sessions.",
    icon: "Search",
    category: "Research",
    color: "#38bdf8",
    skills: ["research-brief"],
    connectors: ["web-search"],
  },
  {
    id: "dev-workbench",
    name: "Dev Workbench",
    description: "Developer-focused project summaries and repository handoff helpers.",
    icon: "Code",
    category: "Development",
    color: "#a78bfa",
    skills: ["workspace-summarizer"],
    connectors: ["github", "filesystem"],
  },
  {
    id: "security-triage",
    name: "Security Triage",
    description: "Incident notes, evidence organization, and safe remediation planning.",
    icon: "ShieldCheck",
    category: "Security",
    color: "#22c55e",
    skills: ["incident-triage"],
    connectors: [],
  },
];
