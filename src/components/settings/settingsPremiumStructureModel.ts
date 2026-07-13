export const generalAdvancedSettingsControlIds = [
  "general.debugMode",
  "general.experimentalMode",
  "systemPermissions.checkStatus",
  "systemPermissions.grantAccess",
  "browserSessions.clearImportedSession",
] as const;

export const brainAdvancedDetailsControlIds = [
  "brain.geminiBaseUrl",
  "brain.anthropicBaseUrl",
  "brain.openaiBaseUrl",
  "brain.xaiBaseUrl",
  "brain.deepseekBaseUrl",
  "brain.ollamaDiagnostics",
  "brain.loadBalancerTelemetry",
  "brain.rawModelIds",
] as const;

export const voiceAdvancedRoutingControlIds = [
  "voice.routingPolicyTelemetry",
  "voice.sttModelSelection",
  "voice.ttsModelSelection",
  "voice.providerDiagnostics",
] as const;

export const visionAdvancedDetailsControlIds = [
  "vision.rawModelIds",
  "vision.gpuRuntimeNotes",
  "vision.localRestrictions",
  "vision.performanceDiagnostics",
] as const;

export const settingsPremiumTabStructure = {
  general: [
    "Luca Persona",
    "Material & Display",
    "Luca Behavior",
    "Privacy & Awareness",
    "Browser Sessions",
    "Startup & Window Behavior",
    "Advanced Settings",
  ],
  brain: [
    "Brain Status / Intelligence Mode",
    "Main Model Preference",
    "Provider Access / BYOK",
    "Local Brain / Runtime",
    "Advanced Details",
  ],
  voice: [
    "Voice Experience",
    "Listening",
    "Voice Selection",
    "Voice Cloning",
    "Advanced Voice Routing",
  ],
  vision: [
    "Vision Awareness",
    "Vision Engine",
    "Model Selection",
    "Advanced Vision Details",
  ],
} as const;

export const remainingSettingsPremiumTabStructure = {
  "model-manager": [
    "Model Library Summary",
    "Recommended Models",
    "Installed Models",
    "Downloads",
    "Runtime",
    "Advanced Details",
  ],
  "mcp-bridge": [
    "MCP Status",
    "Connected MCP Servers",
    "Add MCP Server",
    "Permissions",
    "Tool Approval Policy",
    "Advanced Details",
  ],
  connectors: [
    "Connected Apps",
    "Recommended Connectors",
    "Connector Permissions",
    "Activity & Safety",
    "Advanced Details",
  ],
  data: [
    "Memory Status",
    "What Luca Remembers",
    "Memory Controls",
    "Data Export",
    "Privacy",
    "Danger Zone",
  ],
  "knowledge-bridge": [
    "Knowledge Status",
    "Sources",
    "Add Knowledge",
    "Retrieval Settings",
    "Source Management",
    "Advanced Details",
  ],
  lucalink: [
    "LucaLink Device Center",
    "Devices",
    "Approvals",
    "Guest Sessions",
    "Sync & Handoff",
    "Advanced",
    "Linked Devices",
    "Pair New Device",
    "Sync Behavior",
    "Access Control",
    "Advanced Details",
  ],
  autonomy: [
    "Autonomy Status",
    "Permission Level",
    "Missions",
    "Safety Controls",
    "Resource Awareness",
    "Advanced Details",
  ],
  iot: [
    "Home Status",
    "Devices",
    "Permissions",
    "Automations",
    "Advanced Details",
  ],
  profile: [
    "Operator Profile",
    "Work Context",
    "Personalization",
    "Identity Lock",
    "Advanced Details",
  ],
  personality: [
    "Luca Personality",
    "Behavior Preferences",
    "Role Profiles",
    "Boundaries",
    "Advanced / Origin-only",
  ],
  about: ["LucaOS Version", "System Info", "Legal & Trust", "Advanced Details"],
} as const;

export const remainingAdvancedDetailsControlIds = [
  "model-manager.rawModelIds",
  "model-manager.modelPaths",
  "model-manager.runtimeLogs",
  "mcp-bridge.rawMcpJson",
  "mcp-bridge.serverLogs",
  "mcp-bridge.protocolDiagnostics",
  "connectors.browserSessions",
  "connectors.tokenRefreshState",
  "knowledge-bridge.embeddingModel",
  "knowledge-bridge.chunkingSettings",
  "knowledge-bridge.vectorStoreDiagnostics",
  "lucalink.relayMode",
  "lucalink.pairingTokenDiagnostics",
  "autonomy.planningTraces",
  "autonomy.toolExecutionDiagnostics",
  "iot.homeAssistantEndpoint",
  "iot.accessToken",
  "profile.rawProfileJson",
  "personality.rawSystemBlueprint",
  "about.buildMetadata",
] as const;

export const remainingDangerZoneControlIds = [
  "data.deleteMemory",
  "data.clearSessions",
] as const;
