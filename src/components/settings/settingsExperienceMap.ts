export const settingsExperienceModes = [
  "standard-user",
  "tactical-user",
  "origin-user",
] as const;

export type SettingsExperienceMode = (typeof settingsExperienceModes)[number];

export const settingsClassificationLabels = [
  "standard-user",
  "tactical-user",
  "origin-user",
  "advanced-feature",
  "experimental",
  "privacy-sensitive",
  "permission-sensitive",
  "runtime-sensitive",
  "model-sensitive",
  "device-sensitive",
  "safe-display-only",
  "needs-product-language-review",
  "needs-mobile-layout-review",
] as const;

export type SettingsClassificationLabel =
  (typeof settingsClassificationLabels)[number];

export type SettingsLanguageFit =
  | "user-friendly"
  | "technical"
  | "unclear"
  | "appropriate";

export type SettingsAvailability = "desktop" | "mobile";

export type SettingsFuturePlacement =
  | "top-level-everyone"
  | "advanced-features"
  | "tactical-mode"
  | "origin-creator-mode";

export interface SettingsExperienceMapEntry {
  id: string;
  currentLabel: string;
  icon: string;
  availability: SettingsAvailability[];
  currentComponent: string;
  controls: string;
  primaryExperience: SettingsExperienceMode;
  classificationLabels: SettingsClassificationLabel[];
  sensitiveCapabilityImplications: string[];
  languageFit: SettingsLanguageFit;
  futurePlacement: SettingsFuturePlacement;
  auditNotes: string;
}

export const settingsExperienceMap = [
  {
    id: "general",
    currentLabel: "General",
    icon: "Settings",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsGeneralTab",
    controls:
      "Persona and appearance selection, response style, browser session import, launch/minimize/debug/experimental toggles, glass/text scaling, privacy sensor toggles, and system permission checks.",
    primaryExperience: "standard-user",
    classificationLabels: [
      "standard-user",
      "privacy-sensitive",
      "permission-sensitive",
      "advanced-feature",
      "needs-product-language-review",
    ],
    sensitiveCapabilityImplications: [
      "screen observation",
      "camera access",
      "microphone access",
      "browser profile import",
      "debug and tactical/experimental settings",
    ],
    languageFit: "technical",
    futurePlacement: "top-level-everyone",
    auditNotes:
      "General should stay top-level, but debug, tactical, global forge, sensor, and browser-import language should be separated or framed with clearer consumer-safe explanations.",
  },
  {
    id: "brain",
    currentLabel: "Brain",
    icon: "Cpu",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsBrainTab",
    controls:
      "Cloud/BYOK API keys, proxy/base URLs, intelligence presets, core model selection, memory gateway model, history indexing, local Ollama service, load balancer status, and temperature.",
    primaryExperience: "tactical-user",
    classificationLabels: [
      "standard-user",
      "tactical-user",
      "advanced-feature",
      "model-sensitive",
      "privacy-sensitive",
      "runtime-sensitive",
      "needs-product-language-review",
    ],
    sensitiveCapabilityImplications: [
      "API key handling",
      "model routing",
      "local/cloud inference routing",
      "history indexing",
      "proxy endpoint configuration",
    ],
    languageFit: "technical",
    futurePlacement: "top-level-everyone",
    auditNotes:
      "Brain belongs near the top because LucaOS is a local/cloud/BYOK AI OS, but proxy, Ollama, load-balancer, and maintenance controls are tactical candidates.",
  },
  {
    id: "voice",
    currentLabel: "Voice",
    icon: "Microphone",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsVoiceTab",
    controls:
      "Wake word, speech-to-text provider/model, voice provider, persona-synced voice identity, pacing, latency telemetry, local voice models, and voice clone management.",
    primaryExperience: "standard-user",
    classificationLabels: [
      "standard-user",
      "advanced-feature",
      "privacy-sensitive",
      "permission-sensitive",
      "runtime-sensitive",
      "needs-product-language-review",
    ],
    sensitiveCapabilityImplications: [
      "microphone capture",
      "voice identity and cloning",
      "cloud/local speech routing",
      "wake-word listening",
    ],
    languageFit: "technical",
    futurePlacement: "top-level-everyone",
    auditNotes:
      "Voice is a core embodied-agent surface and should remain easy to find; telemetry, cloning, and provider routing need clearer progressive disclosure.",
  },
  {
    id: "vision",
    currentLabel: "Vision",
    icon: "Share",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsVisionTab",
    controls:
      "Vision engine and multimodal model selection for visual/spatial understanding.",
    primaryExperience: "standard-user",
    classificationLabels: [
      "standard-user",
      "privacy-sensitive",
      "permission-sensitive",
      "model-sensitive",
    ],
    sensitiveCapabilityImplications: [
      "camera or image analysis",
      "vision model routing",
    ],
    languageFit: "appropriate",
    futurePlacement: "top-level-everyone",
    auditNotes:
      "Vision is conceptually top-level for an embodied AI agent, but the Share icon may not communicate visual awareness clearly.",
  },
  {
    id: "model-manager",
    currentLabel: "Model Manager",
    icon: "Database",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsModelManagerTab",
    controls:
      "Runtime diagnostics, response dynamic controls, local model downloads/management, GGUF/ONNX storage notes, and model runtime status.",
    primaryExperience: "tactical-user",
    classificationLabels: [
      "tactical-user",
      "advanced-feature",
      "runtime-sensitive",
      "model-sensitive",
      "needs-product-language-review",
      "needs-mobile-layout-review",
    ],
    sensitiveCapabilityImplications: [
      "runtime diagnostics",
      "local model installation",
      "model storage and execution",
    ],
    languageFit: "technical",
    futurePlacement: "advanced-features",
    auditNotes:
      "Model Manager is powerful and useful, but its runtime diagnostics and model-management tone reads tactical rather than standard-user-first.",
  },
  {
    id: "personality",
    currentLabel: "Personality",
    icon: "User",
    availability: ["desktop", "mobile"],
    currentComponent: "PersonalityDashboard",
    controls:
      "Global system rules, persona lenses, read-only system blueprints, system logic text, voice signature, and persona protocol indicators.",
    primaryExperience: "standard-user",
    classificationLabels: [
      "standard-user",
      "origin-user",
      "advanced-feature",
      "runtime-sensitive",
      "needs-product-language-review",
    ],
    sensitiveCapabilityImplications: [
      "global behavior directives",
      "persona system logic",
      "assistant identity and behavior tuning",
    ],
    languageFit: "technical",
    futurePlacement: "top-level-everyone",
    auditNotes:
      "Personality should remain discoverable, but raw directive editing and system blueprints are creator/origin-grade controls that need guardrails and friendlier copy.",
  },
  {
    id: "autonomy",
    currentLabel: "Autonomy",
    icon: "Ghost",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsAutonomyTab",
    controls:
      "Background missions, shadow execution, idle threshold, double-brain consensus, resource awareness, security note, and mission killswitch.",
    primaryExperience: "tactical-user",
    classificationLabels: [
      "tactical-user",
      "advanced-feature",
      "experimental",
      "permission-sensitive",
      "runtime-sensitive",
      "needs-product-language-review",
    ],
    sensitiveCapabilityImplications: [
      "proactive goal pursuit",
      "tool usage without explicit UI feedback",
      "mission execution controls",
      "resource and action governance",
    ],
    languageFit: "technical",
    futurePlacement: "tactical-mode",
    auditNotes:
      "Autonomy is the clearest tactical safety/governance candidate; current copy is candid but should not appear as a casual standard-user switch without stronger explanation.",
  },
  {
    id: "profile",
    currentLabel: "Profile",
    icon: "InfoCircle",
    availability: ["desktop", "mobile"],
    currentComponent: "OperatorProfilePanel",
    controls:
      "Operator identity, role/domain, expertise, Luca tone, partnership state, bond metrics, behavioral calibration, insights, timeline, directives, and identity lock enrollment.",
    primaryExperience: "standard-user",
    classificationLabels: [
      "standard-user",
      "privacy-sensitive",
      "permission-sensitive",
      "needs-product-language-review",
    ],
    sensitiveCapabilityImplications: [
      "operator identity profile",
      "behavioral pattern insights",
      "reference image or identity lock data",
    ],
    languageFit: "appropriate",
    futurePlacement: "top-level-everyone",
    auditNotes:
      "Profile is user-facing and important for personalization; some 'operator' and 'matrix' copy is stylized but coherent with LucaOS identity.",
  },
  {
    id: "lucalink",
    currentLabel: "Luca Link",
    icon: "Wifi",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsLucaLinkTab",
    controls:
      "Remote access enablement, pairing token/QR, guest access links, relay/VPN/local connection modes, desktop address, cloud relay URL, PIN protection, and mobile desktop connection.",
    primaryExperience: "standard-user",
    classificationLabels: [
      "standard-user",
      "advanced-feature",
      "privacy-sensitive",
      "permission-sensitive",
      "runtime-sensitive",
      "needs-mobile-layout-review",
    ],
    sensitiveCapabilityImplications: [
      "remote access",
      "public guest links",
      "pairing tokens",
      "relay or VPN connectivity",
      "live voice chat access",
    ],
    languageFit: "appropriate",
    futurePlacement: "top-level-everyone",
    auditNotes:
      "Luca Link is user valuable but security-critical; it should stay visible with strong security framing and responsive review.",
  },
  {
    id: "mcp-bridge",
    currentLabel: "MCP Bridge",
    icon: "Plug",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsMCPBridgeTab",
    controls:
      "Inbound MCP skill/server import, outbound tool/server export, custom server setup, marketplace servers, commands, environment variables, and connectivity bridge controls.",
    primaryExperience: "tactical-user",
    classificationLabels: [
      "tactical-user",
      "advanced-feature",
      "privacy-sensitive",
      "permission-sensitive",
      "runtime-sensitive",
      "needs-product-language-review",
      "needs-mobile-layout-review",
    ],
    sensitiveCapabilityImplications: [
      "tool import/export",
      "filesystem and GitHub access",
      "messaging or database MCP servers",
      "custom command execution configuration",
    ],
    languageFit: "technical",
    futurePlacement: "advanced-features",
    auditNotes:
      "MCP Bridge is a tactical/power-user tool connection surface and should be available through Advanced Features; future raw creator/system-update tool controls belong in Origin mode, not normal MCP Bridge usage.",
  },
  {
    id: "iot",
    currentLabel: "Smart Home",
    icon: "Home",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsIoTTab",
    controls:
      "Home Assistant server URL and long-lived access token for smart-home integration.",
    primaryExperience: "tactical-user",
    classificationLabels: [
      "standard-user",
      "tactical-user",
      "advanced-feature",
      "privacy-sensitive",
      "permission-sensitive",
      "device-sensitive",
    ],
    sensitiveCapabilityImplications: [
      "smart-home device access",
      "Home Assistant long-lived token",
      "local network endpoint configuration",
    ],
    languageFit: "appropriate",
    futurePlacement: "advanced-features",
    auditNotes:
      "Smart Home is user-facing but capability-sensitive; future IA should keep it discoverable while treating device control as an advanced feature.",
  },
  {
    id: "connectors",
    currentLabel: "Connectors",
    icon: "Link",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsConnectorsTab",
    controls:
      "Social and workspace account connection matrix for WhatsApp, Telegram, Google Workspace, X/Twitter, Instagram, LinkedIn, YouTube, Discord, and WeChat via browser automation/session persistence.",
    primaryExperience: "tactical-user",
    classificationLabels: [
      "tactical-user",
      "advanced-feature",
      "privacy-sensitive",
      "permission-sensitive",
      "runtime-sensitive",
      "needs-product-language-review",
      "needs-mobile-layout-review",
    ],
    sensitiveCapabilityImplications: [
      "social account access",
      "workspace account access",
      "browser automation",
      "session persistence",
      "messaging and content surfaces",
    ],
    languageFit: "technical",
    futurePlacement: "advanced-features",
    auditNotes:
      "Connectors has high value but reads like an automation console; mobile Advanced Settings should expose it while continued responsive layout review clarifies the mobile experience.",
  },
  {
    id: "data",
    currentLabel: "Data & Memory",
    icon: "Database",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsDataTab",
    controls:
      "Memory count, JSON export, store wipe, fact search/explorer, per-memory delete, and active session reset.",
    primaryExperience: "standard-user",
    classificationLabels: [
      "standard-user",
      "privacy-sensitive",
      "safe-display-only",
      "permission-sensitive",
    ],
    sensitiveCapabilityImplications: [
      "memory export",
      "memory deletion",
      "session cleanup",
      "personal fact display",
    ],
    languageFit: "user-friendly",
    futurePlacement: "top-level-everyone",
    auditNotes:
      "Data & Memory should remain top-level for user trust; destructive actions need continued clear confirmation in future redesigns.",
  },
  {
    id: "knowledge-bridge",
    currentLabel: "Knowledge Base",
    icon: "Share",
    availability: ["desktop", "mobile"],
    currentComponent: "KnowledgeBridgeTab",
    controls:
      "Local knowledge imports from AI chat exports, IDE/development data, JSON/CSV, SaaS sync for Notion/Google Drive/Obsidian, and future connector placeholders.",
    primaryExperience: "standard-user",
    classificationLabels: [
      "standard-user",
      "advanced-feature",
      "privacy-sensitive",
      "permission-sensitive",
      "runtime-sensitive",
      "needs-mobile-layout-review",
    ],
    sensitiveCapabilityImplications: [
      "file import",
      "SaaS knowledge sync",
      "workspace document indexing",
      "developer context ingestion",
    ],
    languageFit: "appropriate",
    futurePlacement: "top-level-everyone",
    auditNotes:
      "Knowledge Base is central to personal AI OS memory; advanced import sources and SaaS sync can be progressively disclosed within the top-level area.",
  },
  {
    id: "about",
    currentLabel: "About",
    icon: "InfoCircle",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsAboutTab",
    controls:
      "Display-only Luca OS version, uptime, active model/architecture, voice provider, memory/cortex status, vision status, update/permissions links, Electron version, and LucaOS Labs branding.",
    primaryExperience: "standard-user",
    classificationLabels: ["standard-user", "safe-display-only"],
    sensitiveCapabilityImplications: [],
    languageFit: "appropriate",
    futurePlacement: "top-level-everyone",
    auditNotes:
      "About is polished and mostly display-only; it can remain top-level or move to a footer/info area in a future premium settings redesign.",
  },
] as const satisfies readonly SettingsExperienceMapEntry[];

export const settingsFutureTopLevelTabIds = settingsExperienceMap
  .filter((entry) => entry.futurePlacement === "top-level-everyone")
  .map((entry) => entry.id);

export const settingsAdvancedFeatureCandidateTabIds = settingsExperienceMap
  .filter((entry) => entry.futurePlacement === "advanced-features")
  .map((entry) => entry.id);

export const settingsTacticalModeCandidateTabIds = settingsExperienceMap
  .filter((entry) => entry.futurePlacement === "tactical-mode")
  .map((entry) => entry.id);

export const settingsOriginModeAuditNote =
  "Current Settings does not yet include a true Origin/creator dashboard tab; future Origin surfaces should cover self-update, PR/build/release, GitHub push, raw system controls, and system evolution workflows.";

export const settingsOriginModeCandidateTabIds = (
  settingsExperienceMap as readonly SettingsExperienceMapEntry[]
)
  .filter((entry) => entry.futurePlacement === "origin-creator-mode")
  .map((entry) => entry.id);

export const settingsSensitiveTabIds = settingsExperienceMap
  .filter((entry) =>
    entry.classificationLabels.some((label) =>
      [
        "privacy-sensitive",
        "permission-sensitive",
        "runtime-sensitive",
        "model-sensitive",
        "device-sensitive",
      ].includes(label),
    ),
  )
  .map((entry) => entry.id);
