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
    "Native GGUF Runtime",
    "LocalDocs",
    "Installed Models",
    "Runtime",
    "Advanced Details",
  ],
  "mcp-bridge": [
    "MCP Status",
    "Connected MCP Servers",
    "Add MCP Server",
    "Advanced Details",
  ],
  connectors: ["Connected Apps", "Recommended Connectors", "Advanced Details"],
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
    "Advanced Details",
  ],
  lucalink: [
    "Private Memory Boundary",
    "LucaLink Device Center",
    "Bridge Review",
    "Devices",
    "Host Connections / Adaptation",
    "Approvals",
    "Guest Sessions",
    "Sync & Handoff",
    "Advanced",
    "Pair New Device",
    "Advanced Details",
  ],
  autonomy: [
    "Autonomy Status",
    "Missions",
    "Safety Controls",
    "Resource Awareness",
    "Computer-use sandbox",
    "Advanced Details",
  ],
  iot: ["Home Status", "Home Assistant", "Advanced Details"],
  profile: [
    "Operator Profile",
    "Identity",
    "Partnership",
    "Personality traits",
    "Recent insights",
    "Milestones",
    "Assistant preferences",
    "Identity Lock",
    "Advanced Details",
  ],
  personality: ["Luca Personality", "Advanced / Origin-only"],
  about: ["LucaOS Version", "System Info", "Advanced Details"],
} as const;

export const remainingAdvancedDetailsControlIds = [
  "model-manager.rawModelIds",
  "model-manager.modelPaths",
  "mcp-bridge.rawMcpJson",
  "connectors.liveStatus",
  "knowledge-bridge.sourceIndexCounts",
  "lucalink.relayMode",
  "lucalink.pairingTokenDiagnostics",
  "autonomy.sandboxFleetState",
  "iot.endpointDiagnostics",
  "profile.profileMetadata",
  "personality.rawSystemBlueprint",
  "about.buildMetadata",
] as const;

export const remainingDangerZoneControlIds = [
  "data.deleteMemory",
  "data.clearSessions",
] as const;
