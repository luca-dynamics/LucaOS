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
    "Appearance",
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
