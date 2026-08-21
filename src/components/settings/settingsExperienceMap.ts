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
      "Persona and appearance selection, response style, browser session import, launch/minimize/debug/experimental toggles, glass/text scaling, privacy sensor toggles, system permission checks, and the display-only About readout: version, build, runtime, and system specs.",
    primaryExperience: "standard-user",
    classificationLabels: [
      "standard-user",
      "privacy-sensitive",
      "permission-sensitive",
      "advanced-feature",
      "safe-display-only",
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
      "General should stay top-level, but debug, tactical, global forge, sensor, and browser-import language should be separated or framed with clearer consumer-safe explanations. About folded in here as a footer readout, which is what its own audit note already recommended.",
  },
  {
    id: "appearance",
    currentLabel: "Appearance",
    icon: "Palette",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsAppearanceTab",
    controls:
      "LucaOS skin selection (the eight visual operating environments) and how the interface feels.",
    primaryExperience: "standard-user",
    classificationLabels: ["standard-user", "safe-display-only"],
    sensitiveCapabilityImplications: [],
    languageFit: "user-friendly",
    futurePlacement: "top-level-everyone",
    auditNotes:
      "Appearance is a first-class destination per the settings-target design: skins are the product's visual identity and deserve their own pane rather than living inside General.",
  },
  {
    id: "brain",
    currentLabel: "Brain",
    icon: "Cpu",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsBrainTab",
    controls:
      "Cloud/BYOK API keys, proxy/base URLs, intelligence presets, core model selection, memory gateway model, history indexing, local Ollama service, load balancer status, temperature, and the vision engine model for visual/spatial understanding.",
    primaryExperience: "tactical-user",
    classificationLabels: [
      "standard-user",
      "tactical-user",
      "advanced-feature",
      "model-sensitive",
      "privacy-sensitive",
      "permission-sensitive",
      "runtime-sensitive",
      "needs-product-language-review",
    ],
    sensitiveCapabilityImplications: [
      "API key handling",
      "model routing",
      "local/cloud inference routing",
      "history indexing",
      "proxy endpoint configuration",
      "camera or image analysis",
      "vision model routing",
    ],
    languageFit: "technical",
    futurePlacement: "top-level-everyone",
    auditNotes:
      "Brain belongs near the top because LucaOS is a local/cloud/BYOK AI OS, but proxy, Ollama, load-balancer, and maintenance controls are tactical candidates. Vision folded in here: its only control wrote brain.visionModel, so it never justified a destination of its own.",
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
    id: "model-manager",
    currentLabel: "Models",
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
    currentComponent: "SettingsIdentityTab",
    controls:
      "Global system rules, persona lenses, read-only system blueprints, system logic text, voice signature, persona protocol indicators, and the operator profile: identity, expertise, partnership state, insights, timeline, directives, and identity lock enrollment.",
    primaryExperience: "standard-user",
    classificationLabels: [
      "standard-user",
      "origin-user",
      "advanced-feature",
      "privacy-sensitive",
      "permission-sensitive",
      "runtime-sensitive",
      "needs-product-language-review",
    ],
    sensitiveCapabilityImplications: [
      "global behavior directives",
      "persona system logic",
      "assistant identity and behavior tuning",
      "operator identity profile",
      "behavioral pattern insights",
      "reference image or identity lock data",
    ],
    languageFit: "technical",
    futurePlacement: "top-level-everyone",
    auditNotes:
      "Personality should remain discoverable, but raw directive editing and system blueprints are creator/origin-grade controls that need guardrails and friendlier copy. Profile folded in here: who Luca is and who Luca is talking to are one identity surface, not two destinations.",
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
    id: "integrations",
    currentLabel: "Integrations",
    icon: "Plug",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsIntegrationsTab",
    // Merged from mcp-bridge + connectors + iot. The classification below is the
    // union of all three, deliberately: a merge must not thin out the security
    // labels or the capability implications of what it absorbed.
    controls:
      "Inbound MCP skill/server import, outbound tool/server export, custom server setup, marketplace servers, commands and environment variables; the social and workspace account connection matrix for WhatsApp, Telegram, Google Workspace, X/Twitter, Instagram, LinkedIn, YouTube, Discord, and WeChat via browser automation/session persistence; and the Home Assistant server URL and long-lived access token.",
    primaryExperience: "tactical-user",
    classificationLabels: [
      "standard-user",
      "tactical-user",
      "advanced-feature",
      "privacy-sensitive",
      "permission-sensitive",
      "runtime-sensitive",
      "device-sensitive",
      "needs-product-language-review",
      "needs-mobile-layout-review",
    ],
    sensitiveCapabilityImplications: [
      "tool import/export",
      "filesystem and GitHub access",
      "messaging or database MCP servers",
      "custom command execution configuration",
      "social account access",
      "workspace account access",
      "browser automation",
      "session persistence",
      "messaging and content surfaces",
      "smart-home device access",
      "Home Assistant long-lived token",
      "local network endpoint configuration",
    ],
    languageFit: "technical",
    futurePlacement: "advanced-features",
    auditNotes:
      "Integrations is the single destination for everything that reaches outside Luca: tool servers, third-party accounts, and devices. All three were separate destinations with the same shape — a connection list plus a credential form — so they read as one surface. Future raw creator/system-update tool controls belong in Origin mode, not here; device control and browser automation stay advanced features; and mobile layout review still applies to the connector matrix.",
  },
  {
    id: "data",
    currentLabel: "Data & Memory",
    icon: "Database",
    availability: ["desktop", "mobile"],
    currentComponent: "SettingsDataTab",
    controls:
      "Memory count, JSON export, store wipe, fact search/explorer, per-memory delete, active session reset, and knowledge imports from AI chat exports, IDE/development data, JSON/CSV, and SaaS sync for Notion/Google Drive/Obsidian.",
    primaryExperience: "standard-user",
    classificationLabels: [
      "standard-user",
      "advanced-feature",
      "privacy-sensitive",
      "safe-display-only",
      "permission-sensitive",
      "runtime-sensitive",
      "needs-mobile-layout-review",
    ],
    sensitiveCapabilityImplications: [
      "memory export",
      "memory deletion",
      "session cleanup",
      "personal fact display",
      "file import",
      "SaaS knowledge sync",
      "workspace document indexing",
      "developer context ingestion",
    ],
    languageFit: "user-friendly",
    futurePlacement: "top-level-everyone",
    auditNotes:
      "Data & Memory should remain top-level for user trust; destructive actions need continued clear confirmation in future redesigns. Knowledge Base folded in here: what Luca is given to read and what Luca remembers are the same user question, and splitting them made neither answerable.",
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
