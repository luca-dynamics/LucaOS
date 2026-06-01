export const settingsSectionClassificationLabels = [
  "standard-user",
  "advanced-feature",
  "tactical-user",
  "origin-candidate",
  "experimental",
  "privacy-sensitive",
  "permission-sensitive",
  "runtime-sensitive",
  "model-sensitive",
  "memory-sensitive",
  "voice-sensitive",
  "vision-sensitive",
  "device-sensitive",
  "connector-sensitive",
  "autonomy-sensitive",
  "display-only",
  "writes-settings",
  "misplaced-candidate",
  "duplicate-candidate",
  "needs-advanced-subsection",
  "needs-product-refinement",
  "needs-integration-review",
  "benchmark-aligned",
  "benchmark-gap",
  "lucaos-differentiator",
  "good-current-placement",
] as const;

export type SettingsSectionClassificationLabel =
  (typeof settingsSectionClassificationLabels)[number];

export type SettingsSectionPlacementAssessment =
  | "good-current-placement"
  | "keep-visible-with-refinement"
  | "move-to-advanced-later"
  | "move-to-another-tab-later"
  | "merge-or-dedupe-later"
  | "split-or-reframe-later"
  | "future-origin-only";

export type SettingsSectionIntegrationAssessment =
  | "well-integrated"
  | "partially-integrated"
  | "display-only-runtime-gap"
  | "needs-governance-framing"
  | "needs-integration-review"
  | "needs-runtime-health-link"
  | "future-only-placeholder";

export interface SettingsSectionArchitectureEntry {
  tabId: string;
  tabLabel: string;
  sectionId: string;
  sectionTitle: string;
  currentPurpose: string;
  controls: string[];
  settingsKeysOrState: string[];
  classificationLabels: SettingsSectionClassificationLabel[];
  placementAssessment: SettingsSectionPlacementAssessment;
  integrationAssessment: SettingsSectionIntegrationAssessment;
  benchmarkComparison: string;
  recommendedFutureAction: string;
}

export const settingsSectionArchitectureMap = [
  {
    tabId: "general",
    tabLabel: "General",
    sectionId: "persona-appearance",
    sectionTitle: "Persona & Appearance",
    currentPurpose:
      "Select Luca persona, theme, and persona/theme synchronization.",
    controls: ["sync theme toggle", "persona selector", "theme selector"],
    settingsKeysOrState: [
      "general.syncThemeWithPersona",
      "general.persona",
      "general.theme",
    ],
    classificationLabels: [
      "standard-user",
      "writes-settings",
      "benchmark-aligned",
      "needs-product-refinement",
      "good-current-placement",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "well-integrated",
    benchmarkComparison:
      "Aligns with common Appearance/Personalization settings, though persona capability language is more LucaOS-specific than mainstream AI apps.",
    recommendedFutureAction:
      "Keep in General for now; later separate simple appearance from deeper persona capability routing.",
  },
  {
    tabId: "general",
    tabLabel: "General",
    sectionId: "tone-style",
    sectionTitle: "Tone Styles",
    currentPurpose: "Tune response style and custom tone dimensions.",
    controls: ["tone style selector", "custom tone dimensions"],
    settingsKeysOrState: ["general.toneStyle", "general.customTone"],
    classificationLabels: [
      "standard-user",
      "writes-settings",
      "benchmark-aligned",
      "good-current-placement",
    ],
    placementAssessment: "good-current-placement",
    integrationAssessment: "well-integrated",
    benchmarkComparison: "Matches personalization controls in major AI apps.",
    recommendedFutureAction:
      "Keep visible; ensure future Personality tab does not duplicate user-facing tone controls without a clear boundary.",
  },
  {
    tabId: "general",
    tabLabel: "General",
    sectionId: "browser-sessions",
    sectionTitle: "Browser Sessions",
    currentPurpose: "Import, inspect, or clear Chrome profile/session context.",
    controls: [
      "Chrome profile status",
      "import profile",
      "clear imported profile",
    ],
    settingsKeysOrState: [
      "chrome profile import state",
      "browser session import state",
    ],
    classificationLabels: [
      "advanced-feature",
      "privacy-sensitive",
      "permission-sensitive",
      "connector-sensitive",
      "writes-settings",
      "benchmark-gap",
      "needs-advanced-subsection",
      "needs-product-refinement",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Mainstream AI apps usually place browser/app connections under Connectors or Data Controls, not General.",
    recommendedFutureAction:
      "Move later to Connectors or a Privacy/Data subsection with stronger session-scope explanation.",
  },
  {
    tabId: "general",
    tabLabel: "General",
    sectionId: "global-ui-preferences",
    sectionTitle: "Global UI Preferences",
    currentPurpose:
      "Configure startup, tray, diagnostics, advanced features, background visibility, and global forge visibility.",
    controls: [
      "start on boot",
      "minimize to tray",
      "diagnostic mode",
      "advanced features",
      "background opacity",
      "background blur",
      "global forge visibility",
    ],
    settingsKeysOrState: [
      "general.startOnBoot",
      "general.minimizeToTray",
      "general.debugMode",
      "general.experimentalMode",
      "general.backgroundOpacity",
      "general.backgroundBlur",
      "general.globalForgeVisible",
    ],
    classificationLabels: [
      "standard-user",
      "advanced-feature",
      "experimental",
      "runtime-sensitive",
      "writes-settings",
      "benchmark-gap",
      "needs-advanced-subsection",
      "needs-product-refinement",
    ],
    placementAssessment: "split-or-reframe-later",
    integrationAssessment: "partially-integrated",
    benchmarkComparison:
      "Appearance and startup are benchmark-aligned; diagnostics, experimental mode, and global forge are developer/advanced controls.",
    recommendedFutureAction:
      "Split later into Appearance/App Behavior and Advanced/Developer disclosure.",
  },
  {
    tabId: "general",
    tabLabel: "General",
    sectionId: "typography-scaling",
    sectionTitle: "Typography & Global Scaling",
    currentPurpose: "Set app font family and global text scale.",
    controls: ["font selector", "font scale slider"],
    settingsKeysOrState: ["general.fontFamily", "general.fontScale"],
    classificationLabels: [
      "standard-user",
      "writes-settings",
      "benchmark-aligned",
      "good-current-placement",
    ],
    placementAssessment: "good-current-placement",
    integrationAssessment: "well-integrated",
    benchmarkComparison:
      "Comparable to accessibility/display preferences in polished desktop apps.",
    recommendedFutureAction:
      "Keep visible; consider accessibility wording in future redesign.",
  },
  {
    tabId: "general",
    tabLabel: "General",
    sectionId: "privacy-awareness",
    sectionTitle: "Privacy & Awareness",
    currentPurpose:
      "Toggle sensors/product improvement and launch system permission checks.",
    controls: [
      "screen observation toggle",
      "camera access toggle",
      "microphone toggle",
      "product improvement toggle",
      "check permissions",
      "grant access",
    ],
    settingsKeysOrState: [
      "privacy.screenEnabled",
      "privacy.cameraEnabled",
      "privacy.micEnabled",
      "privacy.telemetryEnabled",
      "system permission check state",
    ],
    classificationLabels: [
      "standard-user",
      "privacy-sensitive",
      "permission-sensitive",
      "vision-sensitive",
      "voice-sensitive",
      "writes-settings",
      "benchmark-aligned",
      "needs-product-refinement",
      "good-current-placement",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Major AI apps expose privacy/data controls clearly; LucaOS goes further because it has embodied sensors.",
    recommendedFutureAction:
      "Keep visible but likely elevate to a dedicated Privacy & Safety area with explicit sensor scope and runtime indicators.",
  },
  {
    tabId: "brain",
    tabLabel: "Brain",
    sectionId: "cloud-api-config",
    sectionTitle: "Cloud API Config",
    currentPurpose:
      "Configure BYOK provider keys and base URLs for Gemini, Anthropic, OpenAI, xAI, and DeepSeek.",
    controls: ["provider mode toggles", "API key fields", "base URL fields"],
    settingsKeysOrState: [
      "brain.geminiMode",
      "brain.geminiApiKey",
      "brain.geminiBaseUrl",
      "brain.anthropicApiKey",
      "brain.anthropicBaseUrl",
      "brain.openaiApiKey",
      "brain.openaiBaseUrl",
      "brain.xaiApiKey",
      "brain.xaiBaseUrl",
      "brain.deepseekApiKey",
      "brain.deepseekBaseUrl",
    ],
    classificationLabels: [
      "advanced-feature",
      "tactical-user",
      "privacy-sensitive",
      "runtime-sensitive",
      "model-sensitive",
      "writes-settings",
      "benchmark-gap",
      "lucaos-differentiator",
      "needs-advanced-subsection",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Consumer AI apps rarely expose raw provider keys; developer-agent products do.",
    recommendedFutureAction:
      "Keep Brain as the model home, but progressively disclose provider credentials under Advanced/BYOK.",
  },
  {
    tabId: "brain",
    tabLabel: "Brain",
    sectionId: "strategic-presets",
    sectionTitle: "Strategic Presets",
    currentPurpose:
      "Apply cloud/local/offline intelligence routing presets across brain, vision, and memory models.",
    controls: [
      "optimized",
      "cloud only",
      "local only",
      "offline preset buttons",
    ],
    settingsKeysOrState: [
      "brain.model",
      "brain.visionModel",
      "brain.memoryModel",
    ],
    classificationLabels: [
      "standard-user",
      "advanced-feature",
      "runtime-sensitive",
      "model-sensitive",
      "vision-sensitive",
      "memory-sensitive",
      "writes-settings",
      "benchmark-gap",
      "lucaos-differentiator",
      "good-current-placement",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "well-integrated",
    benchmarkComparison:
      "More OS-like than normal AI apps and appropriate for LucaOS model routing.",
    recommendedFutureAction:
      "Keep in Brain with clearer plain-language explanation of cost, privacy, and latency tradeoffs.",
  },
  {
    tabId: "brain",
    tabLabel: "Brain",
    sectionId: "intelligence-card",
    sectionTitle: "Intelligence Card",
    currentPurpose:
      "Select primary reasoning model and custom/external model value.",
    controls: ["model selector", "custom model input"],
    settingsKeysOrState: ["brain.model"],
    classificationLabels: [
      "standard-user",
      "model-sensitive",
      "runtime-sensitive",
      "writes-settings",
      "benchmark-aligned",
      "good-current-placement",
    ],
    placementAssessment: "good-current-placement",
    integrationAssessment: "well-integrated",
    benchmarkComparison:
      "Aligns with model picker expectations, but deeper than many consumer settings.",
    recommendedFutureAction:
      "Keep top-level in Brain; later add health/status beside each route.",
  },
  {
    tabId: "brain",
    tabLabel: "Brain",
    sectionId: "memory-gateway",
    sectionTitle: "Memory Gateway",
    currentPurpose: "Select the model used for memory extraction/routing.",
    controls: ["memory model selector"],
    settingsKeysOrState: ["brain.memoryModel"],
    classificationLabels: [
      "advanced-feature",
      "memory-sensitive",
      "model-sensitive",
      "runtime-sensitive",
      "writes-settings",
      "benchmark-gap",
      "needs-advanced-subsection",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "partially-integrated",
    benchmarkComparison:
      "Major AI apps expose Memory as a user concept, not a separate memory model route.",
    recommendedFutureAction:
      "Move later into Advanced Brain or Data & Memory internals while keeping user memory controls under Data & Memory.",
  },
  {
    tabId: "brain",
    tabLabel: "Brain",
    sectionId: "knowledge-maintenance",
    sectionTitle: "Knowledge Maintenance",
    currentPurpose:
      "Configure background knowledge sync and interval; documents privacy note for import distillation.",
    controls: [
      "background sync toggle",
      "sync interval selector",
      "privacy note",
    ],
    settingsKeysOrState: ["knowledge sync UI state", "sync interval UI state"],
    classificationLabels: [
      "advanced-feature",
      "privacy-sensitive",
      "memory-sensitive",
      "runtime-sensitive",
      "writes-settings",
      "duplicate-candidate",
      "needs-integration-review",
      "needs-advanced-subsection",
    ],
    placementAssessment: "merge-or-dedupe-later",
    integrationAssessment: "partially-integrated",
    benchmarkComparison:
      "Overlaps with Knowledge Base and Data & Memory; mainstream apps would centralize data controls.",
    recommendedFutureAction:
      "Consolidate later with Knowledge Base/Data & Memory so background indexing has one owner.",
  },
  {
    tabId: "brain",
    tabLabel: "Brain",
    sectionId: "quota-intelligence",
    sectionTitle: "Quota Intelligence",
    currentPurpose:
      "Show model quota/latency intelligence and response performance indicators.",
    controls: ["average response display", "quota/status indicators"],
    settingsKeysOrState: ["quota telemetry state", "latency telemetry state"],
    classificationLabels: [
      "advanced-feature",
      "runtime-sensitive",
      "model-sensitive",
      "display-only",
      "benchmark-gap",
      "needs-integration-review",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "display-only-runtime-gap",
    benchmarkComparison:
      "Developer tools expose telemetry; consumer AI apps generally hide it.",
    recommendedFutureAction:
      "Keep as tactical diagnostics; later link to runtime health and route failover.",
  },
  {
    tabId: "brain",
    tabLabel: "Brain",
    sectionId: "local-ollama-service",
    sectionTitle: "Local Ollama Service",
    currentPurpose: "Manage or inspect local model service availability.",
    controls: [
      "Ollama service status",
      "refresh/resync controls",
      "local model route information",
    ],
    settingsKeysOrState: ["local Ollama runtime state"],
    classificationLabels: [
      "advanced-feature",
      "tactical-user",
      "runtime-sensitive",
      "model-sensitive",
      "device-sensitive",
      "writes-settings",
      "benchmark-gap",
      "lucaos-differentiator",
      "needs-advanced-subsection",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "needs-runtime-health-link",
    benchmarkComparison:
      "Developer-agent settings may expose local runtimes; mainstream AI apps usually do not.",
    recommendedFutureAction:
      "Keep as LucaOS differentiator but move to Advanced Brain/Model Manager later.",
  },
  {
    tabId: "brain",
    tabLabel: "Brain",
    sectionId: "creativity-heat-pool",
    sectionTitle: "Creativity / Heat Pool",
    currentPurpose: "Adjust generation temperature.",
    controls: ["temperature slider"],
    settingsKeysOrState: ["brain.temperature"],
    classificationLabels: [
      "advanced-feature",
      "model-sensitive",
      "writes-settings",
      "benchmark-aligned",
      "needs-advanced-subsection",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "well-integrated",
    benchmarkComparison:
      "Some AI apps expose style/creativity controls; raw temperature is more technical.",
    recommendedFutureAction:
      "Rename/reframe later to user-facing creativity controls or hide raw value under Advanced.",
  },
  {
    tabId: "voice",
    tabLabel: "Voice",
    sectionId: "voice-presets",
    sectionTitle: "Strategic Presets",
    currentPurpose:
      "Apply voice stack presets across STT, TTS, local/cloud voice, and model routing.",
    controls: [
      "instant cloud preset",
      "hybrid/local presets",
      "persona voice sync presets",
    ],
    settingsKeysOrState: [
      "voice.sttModel",
      "voice.provider",
      "voice.voiceId",
      "brain.model",
    ],
    classificationLabels: [
      "standard-user",
      "advanced-feature",
      "voice-sensitive",
      "runtime-sensitive",
      "model-sensitive",
      "writes-settings",
      "benchmark-gap",
      "lucaos-differentiator",
      "good-current-placement",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "well-integrated",
    benchmarkComparison:
      "Voice settings are benchmark-aligned; route-changing presets are LucaOS-specific.",
    recommendedFutureAction:
      "Keep visible but explain privacy/latency implications.",
  },
  {
    tabId: "voice",
    tabLabel: "Voice",
    sectionId: "acoustic-detection",
    sectionTitle: "Acoustic Detection",
    currentPurpose:
      "Enable wake-word listening and browser speech-recognition fallback.",
    controls: ["wake word toggle", "speech recognition support fallback"],
    settingsKeysOrState: ["voice.wakeWordEnabled", "voice.sttModel"],
    classificationLabels: [
      "standard-user",
      "privacy-sensitive",
      "permission-sensitive",
      "voice-sensitive",
      "runtime-sensitive",
      "writes-settings",
      "benchmark-aligned",
      "needs-product-refinement",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Voice/wake controls are expected, but require explicit microphone framing.",
    recommendedFutureAction:
      "Keep top-level with clear always-listening and permission copy.",
  },
  {
    tabId: "voice",
    tabLabel: "Voice",
    sectionId: "listening-model",
    sectionTitle: "Listening Model",
    currentPurpose: "Choose speech-to-text model/provider.",
    controls: ["STT model selector"],
    settingsKeysOrState: ["voice.sttModel", "voice.provider"],
    classificationLabels: [
      "advanced-feature",
      "voice-sensitive",
      "privacy-sensitive",
      "runtime-sensitive",
      "writes-settings",
      "benchmark-aligned",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "well-integrated",
    benchmarkComparison:
      "Major AI apps expose voice mode but not always raw STT provider selection.",
    recommendedFutureAction:
      "Keep visible for LucaOS; later offer simple recommended/local/cloud choices.",
  },
  {
    tabId: "voice",
    tabLabel: "Voice",
    sectionId: "vocal-synthesis-engine",
    sectionTitle: "Vocal Synthesis Engine",
    currentPurpose: "Choose TTS provider and voice identity.",
    controls: [
      "TTS provider selector",
      "managed persona voice",
      "OpenAI voice selector",
      "Deepgram voice selector",
      "local voice selector",
    ],
    settingsKeysOrState: ["voice.provider", "voice.voiceId"],
    classificationLabels: [
      "standard-user",
      "advanced-feature",
      "voice-sensitive",
      "privacy-sensitive",
      "runtime-sensitive",
      "writes-settings",
      "benchmark-aligned",
      "good-current-placement",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "well-integrated",
    benchmarkComparison:
      "Voice identity is a normal embodied AI setting; provider internals are advanced.",
    recommendedFutureAction:
      "Keep in Voice; later split simple voice identity from advanced engine routing.",
  },
  {
    tabId: "voice",
    tabLabel: "Voice",
    sectionId: "rhythm-calibration",
    sectionTitle: "Rhythm Calibration",
    currentPurpose: "Adjust speaking pacing/rate.",
    controls: ["pacing presets", "rate updates"],
    settingsKeysOrState: ["voice.pacing", "voice.rate"],
    classificationLabels: [
      "standard-user",
      "voice-sensitive",
      "writes-settings",
      "benchmark-aligned",
      "good-current-placement",
    ],
    placementAssessment: "good-current-placement",
    integrationAssessment: "well-integrated",
    benchmarkComparison: "Matches expected voice personalization.",
    recommendedFutureAction: "Keep visible.",
  },
  {
    tabId: "voice",
    tabLabel: "Voice",
    sectionId: "voice-telemetry",
    sectionTitle: "Voice Intelligence Telemetry",
    currentPurpose: "Display STT, reasoning, and TTS latency flow.",
    controls: [
      "speech recognition latency",
      "reasoning latency",
      "TTS buffer/synthesis flow",
    ],
    settingsKeysOrState: ["voice telemetry runtime state"],
    classificationLabels: [
      "advanced-feature",
      "runtime-sensitive",
      "voice-sensitive",
      "display-only",
      "benchmark-gap",
      "needs-advanced-subsection",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "display-only-runtime-gap",
    benchmarkComparison:
      "Telemetry is developer-agent quality, not standard consumer settings.",
    recommendedFutureAction:
      "Move under Advanced Voice diagnostics or a runtime health panel later.",
  },
  {
    tabId: "voice",
    tabLabel: "Voice",
    sectionId: "voice-cloning-studio",
    sectionTitle: "Voice Cloning Studio",
    currentPurpose:
      "Upload/select cloned voices and manage active cloned voice identity.",
    controls: ["clone upload", "cloned voice selection"],
    settingsKeysOrState: ["voice.activeClonedVoiceId", "voice.clonedVoiceName"],
    classificationLabels: [
      "advanced-feature",
      "experimental",
      "privacy-sensitive",
      "permission-sensitive",
      "voice-sensitive",
      "writes-settings",
      "benchmark-gap",
      "needs-integration-review",
      "needs-advanced-subsection",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Voice cloning is more sensitive than typical voice settings and needs consent/safety framing.",
    recommendedFutureAction:
      "Keep audit-only; later gate under Advanced with explicit consent, provenance, and deletion controls.",
  },
  {
    tabId: "vision",
    tabLabel: "Vision",
    sectionId: "vision-engine",
    sectionTitle: "Vision Engine",
    currentPurpose: "Select visual/spatial understanding model.",
    controls: ["vision model selector"],
    settingsKeysOrState: ["brain.visionModel"],
    classificationLabels: [
      "standard-user",
      "vision-sensitive",
      "privacy-sensitive",
      "permission-sensitive",
      "model-sensitive",
      "writes-settings",
      "benchmark-aligned",
      "good-current-placement",
    ],
    placementAssessment: "good-current-placement",
    integrationAssessment: "well-integrated",
    benchmarkComparison:
      "Vision/camera settings are expected for multimodal AI apps and core to LucaOS embodiment.",
    recommendedFutureAction:
      "Keep top-level; add camera/screen permission framing in future.",
  },
  {
    tabId: "vision",
    tabLabel: "Vision",
    sectionId: "vision-tips",
    sectionTitle: "Vision Tips",
    currentPurpose: "Explain how LucaOS uses visual awareness.",
    controls: ["guidance text"],
    settingsKeysOrState: ["none"],
    classificationLabels: [
      "standard-user",
      "vision-sensitive",
      "display-only",
      "benchmark-aligned",
      "needs-product-refinement",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "partially-integrated",
    benchmarkComparison:
      "Helpful guidance is benchmark-aligned, but should tie to concrete permissions/status.",
    recommendedFutureAction:
      "Keep and connect later to live camera/screen permission state.",
  },
  {
    tabId: "model-manager",
    tabLabel: "Model Manager",
    sectionId: "response-dynamic-controls",
    sectionTitle: "Response Dynamic Controls",
    currentPurpose: "Frame lower-level runtime/model management controls.",
    controls: ["section header"],
    settingsKeysOrState: ["none"],
    classificationLabels: [
      "advanced-feature",
      "tactical-user",
      "runtime-sensitive",
      "model-sensitive",
      "display-only",
      "benchmark-gap",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "partially-integrated",
    benchmarkComparison:
      "Developer-agent tools expose this; mainstream AI apps usually do not.",
    recommendedFutureAction:
      "Keep as advanced/tactical entry point, not normal Settings default.",
  },
  {
    tabId: "model-manager",
    tabLabel: "Model Manager",
    sectionId: "runtime-status",
    sectionTitle: "Runtime Status",
    currentPurpose: "Show runtime diagnostics for model infrastructure.",
    controls: ["runtime diagnostics panel"],
    settingsKeysOrState: ["runtime diagnostics state"],
    classificationLabels: [
      "advanced-feature",
      "tactical-user",
      "runtime-sensitive",
      "model-sensitive",
      "display-only",
      "benchmark-gap",
      "needs-integration-review",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "needs-runtime-health-link",
    benchmarkComparison:
      "Comparable to developer agent diagnostics rather than consumer AI settings.",
    recommendedFutureAction:
      "Link later to Brain route health and local runtime readiness.",
  },
  {
    tabId: "model-manager",
    tabLabel: "Model Manager",
    sectionId: "local-model-manager",
    sectionTitle: "Model Manager",
    currentPurpose: "Manage local model downloads/storage/runtime inventory.",
    controls: [
      "model manager component",
      "local model inventory",
      "download/manage controls",
    ],
    settingsKeysOrState: ["local model manager state"],
    classificationLabels: [
      "advanced-feature",
      "tactical-user",
      "runtime-sensitive",
      "model-sensitive",
      "device-sensitive",
      "writes-settings",
      "benchmark-gap",
      "lucaos-differentiator",
      "needs-advanced-subsection",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "partially-integrated",
    benchmarkComparison:
      "Local model management is a LucaOS differentiator and developer-agent pattern.",
    recommendedFutureAction:
      "Keep but potentially merge with Advanced Brain local runtime controls.",
  },
  {
    tabId: "model-manager",
    tabLabel: "Model Manager",
    sectionId: "local-storage-note",
    sectionTitle: "Local Storage Note",
    currentPurpose: "Explain GGUF/ONNX offline storage location behavior.",
    controls: ["storage note"],
    settingsKeysOrState: ["none"],
    classificationLabels: [
      "advanced-feature",
      "model-sensitive",
      "device-sensitive",
      "display-only",
      "benchmark-gap",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "partially-integrated",
    benchmarkComparison: "Storage notes are useful but technical.",
    recommendedFutureAction:
      "Keep near local models; later add actual storage controls/status.",
  },
  {
    tabId: "personality",
    tabLabel: "Personality",
    sectionId: "unified-consciousness",
    sectionTitle: "Unified Consciousness",
    currentPurpose:
      "Edit global personality instructions shared across personas.",
    controls: ["global instruction editor"],
    settingsKeysOrState: ["personality.ROOT.globalInstructions"],
    classificationLabels: [
      "advanced-feature",
      "tactical-user",
      "origin-candidate",
      "writes-settings",
      "benchmark-gap",
      "needs-advanced-subsection",
    ],
    placementAssessment: "future-origin-only",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Major AI apps expose personalization, not raw system evolution prompts.",
    recommendedFutureAction:
      "Move raw creator prompt evolution to future Origin/Creator Dashboard; keep simple persona style in Settings.",
  },
  {
    tabId: "personality",
    tabLabel: "Personality",
    sectionId: "specialist-focus",
    sectionTitle: "Specialist Focus",
    currentPurpose: "Select and tune persona-specific behavior lenses.",
    controls: ["persona selector", "persona instruction fields"],
    settingsKeysOrState: [
      "personality.<persona>.instruction",
      "personality.<persona>.baseInstruction",
      "personality.<persona>.userInstruction",
    ],
    classificationLabels: [
      "standard-user",
      "advanced-feature",
      "writes-settings",
      "benchmark-aligned",
      "needs-product-refinement",
    ],
    placementAssessment: "split-or-reframe-later",
    integrationAssessment: "partially-integrated",
    benchmarkComparison:
      "Personalization is expected, but raw instruction editing is advanced.",
    recommendedFutureAction:
      "Split user-facing persona style from tactical prompt editing.",
  },
  {
    tabId: "personality",
    tabLabel: "Personality",
    sectionId: "archetype-blueprint",
    sectionTitle: "Archetype Blueprint",
    currentPurpose:
      "Show/edit technical persona protocol details behind advanced disclosure.",
    controls: ["advanced toggle", "archetype readout", "protocol status"],
    settingsKeysOrState: ["personality.<persona>.*"],
    classificationLabels: [
      "advanced-feature",
      "tactical-user",
      "origin-candidate",
      "display-only",
      "writes-settings",
      "benchmark-gap",
      "needs-advanced-subsection",
    ],
    placementAssessment: "future-origin-only",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Raw persona protocol surfaces exceed normal AI app personalization.",
    recommendedFutureAction:
      "Move technical blueprint into Advanced or Origin while preserving friendly personality controls.",
  },
  {
    tabId: "autonomy",
    tabLabel: "Autonomy",
    sectionId: "mission-control",
    sectionTitle: "Mission Control",
    currentPurpose:
      "Control background missions, shadow execution, and idle threshold.",
    controls: [
      "background missions toggle",
      "shadow execution toggle",
      "idle threshold slider",
    ],
    settingsKeysOrState: [
      "autonomy.backgroundMissions",
      "autonomy.shadowExecution",
      "autonomy.idleThreshold",
    ],
    classificationLabels: [
      "advanced-feature",
      "tactical-user",
      "autonomy-sensitive",
      "runtime-sensitive",
      "privacy-sensitive",
      "writes-settings",
      "benchmark-gap",
      "lucaos-differentiator",
      "needs-integration-review",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Autonomy is more advanced than standard chat apps and central to LucaOS.",
    recommendedFutureAction:
      "Keep discoverable but add approvals, stop controls, and safety framing in later PRs.",
  },
  {
    tabId: "autonomy",
    tabLabel: "Autonomy",
    sectionId: "security-hardness",
    sectionTitle: "Security Hardness",
    currentPurpose: "Control double-brain consensus and resource awareness.",
    controls: [
      "double-brain consensus toggle",
      "resource awareness toggle",
      "security note",
    ],
    settingsKeysOrState: [
      "autonomy.doubleBrainConsensus",
      "autonomy.resourceAwareness",
    ],
    classificationLabels: [
      "advanced-feature",
      "tactical-user",
      "autonomy-sensitive",
      "runtime-sensitive",
      "model-sensitive",
      "writes-settings",
      "benchmark-gap",
      "lucaos-differentiator",
      "good-current-placement",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Approval/safety language resembles agentic developer tools more than consumer apps.",
    recommendedFutureAction:
      "Keep with stronger governance link and explicit action approval rules.",
  },
  {
    tabId: "profile",
    tabLabel: "Profile",
    sectionId: "identity-card",
    sectionTitle: "Identity Card",
    currentPurpose: "Display operator identity, promise, and profile summary.",
    controls: ["operator identity display", "profile summary"],
    settingsKeysOrState: ["operator profile state"],
    classificationLabels: [
      "standard-user",
      "privacy-sensitive",
      "display-only",
      "benchmark-aligned",
      "good-current-placement",
    ],
    placementAssessment: "good-current-placement",
    integrationAssessment: "well-integrated",
    benchmarkComparison:
      "Account/Profile is benchmark-aligned, with LucaOS-specific companion framing.",
    recommendedFutureAction: "Keep visible.",
  },
  {
    tabId: "profile",
    tabLabel: "Profile",
    sectionId: "partnership-status",
    sectionTitle: "Partnership Status",
    currentPurpose: "Show Luca/operator bond stage, vibe, growth, and metrics.",
    controls: [
      "stage display",
      "vibe display",
      "growth progress",
      "partnership stats",
    ],
    settingsKeysOrState: ["partnership analytics state"],
    classificationLabels: [
      "standard-user",
      "privacy-sensitive",
      "memory-sensitive",
      "display-only",
      "lucaos-differentiator",
      "needs-product-refinement",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "partially-integrated",
    benchmarkComparison:
      "Differentiated companion OS surface; not common in productivity AI settings.",
    recommendedFutureAction:
      "Keep as LucaOS identity feature; clarify how metrics are computed and stored.",
  },
  {
    tabId: "profile",
    tabLabel: "Profile",
    sectionId: "assistant-directives",
    sectionTitle: "Assistant Directives",
    currentPurpose:
      "Display behavioral directives and identity lock enrollment.",
    controls: ["directive list", "identity lock enrollment surface"],
    settingsKeysOrState: ["assistant directives state", "identity lock state"],
    classificationLabels: [
      "advanced-feature",
      "privacy-sensitive",
      "permission-sensitive",
      "display-only",
      "writes-settings",
      "needs-integration-review",
      "needs-product-refinement",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Security/profile controls are expected but identity lock needs clearer permission framing.",
    recommendedFutureAction:
      "Keep but add privacy/security explanation in future.",
  },
  {
    tabId: "lucalink",
    tabLabel: "Luca Link",
    sectionId: "mobile-client-connection",
    sectionTitle: "Mobile Client Connection",
    currentPurpose:
      "Configure mobile-to-desktop connection mode, address, relay, and connection actions.",
    controls: [
      "connection mode selector",
      "desktop address field",
      "relay server field",
      "QR scanner",
      "connect/disconnect",
    ],
    settingsKeysOrState: [
      "lucaLink.connectionMode",
      "lucaLink.vpnServerUrl",
      "lucaLink.relayServerUrl",
      "mobile connection state",
    ],
    classificationLabels: [
      "standard-user",
      "advanced-feature",
      "privacy-sensitive",
      "permission-sensitive",
      "device-sensitive",
      "runtime-sensitive",
      "writes-settings",
      "benchmark-gap",
      "lucaos-differentiator",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Device pairing is OS-like and beyond standard AI apps.",
    recommendedFutureAction:
      "Later group under Devices/Connections with security-first language.",
  },
  {
    tabId: "lucalink",
    tabLabel: "Luca Link",
    sectionId: "desktop-server-pairing",
    sectionTitle: "Desktop Server Pairing",
    currentPurpose: "Enable remote access and display pairing QR/token.",
    controls: ["enable remote access toggle", "QR code", "pairing token"],
    settingsKeysOrState: [
      "lucaLink.enabled",
      "lucaLink.pairingToken",
      "remote room state",
    ],
    classificationLabels: [
      "standard-user",
      "privacy-sensitive",
      "permission-sensitive",
      "device-sensitive",
      "runtime-sensitive",
      "writes-settings",
      "lucaos-differentiator",
      "needs-product-refinement",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Comparable to device pairing in platform apps, not chatbot settings.",
    recommendedFutureAction:
      "Keep visible with stronger revocation/session management later.",
  },
  {
    tabId: "lucalink",
    tabLabel: "Luca Link",
    sectionId: "guest-access-relay",
    sectionTitle: "Guest Access & Relay",
    currentPurpose:
      "Configure relay/VPN URLs and explain connection protection.",
    controls: ["relay server URL", "VPN server URL", "security info box"],
    settingsKeysOrState: ["lucaLink.relayServerUrl", "lucaLink.vpnServerUrl"],
    classificationLabels: [
      "advanced-feature",
      "privacy-sensitive",
      "device-sensitive",
      "runtime-sensitive",
      "writes-settings",
      "needs-advanced-subsection",
      "needs-integration-review",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Raw relay/VPN config is advanced compared with major AI apps.",
    recommendedFutureAction: "Move under Advanced connection settings later.",
  },
  {
    tabId: "mcp-bridge",
    tabLabel: "MCP Bridge",
    sectionId: "traffic-control-switcher",
    sectionTitle: "Traffic Control Switcher",
    currentPurpose:
      "Switch between inbound tool servers and outbound Luca capability sharing.",
    controls: ["Connect Tool Servers tab", "Share Luca Capabilities tab"],
    settingsKeysOrState: ["bridgeMode component state"],
    classificationLabels: [
      "advanced-feature",
      "tactical-user",
      "connector-sensitive",
      "runtime-sensitive",
      "display-only",
      "benchmark-gap",
      "lucaos-differentiator",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "partially-integrated",
    benchmarkComparison: "Developer-agent settings pattern.",
    recommendedFutureAction:
      "Keep in Advanced Tools/Integrations; clarify inbound vs outbound risk.",
  },
  {
    tabId: "mcp-bridge",
    tabLabel: "MCP Bridge",
    sectionId: "connect-tool-servers",
    sectionTitle: "Connect Tool Servers",
    currentPurpose:
      "Add, inspect, search, and connect MCP servers from active/marketplace sources.",
    controls: [
      "server list",
      "marketplace search",
      "add server form",
      "command/args/url fields",
      "environment variables",
      "auto-connect",
    ],
    settingsKeysOrState: [
      "MCP server local state",
      "MCP registry state",
      "envVars",
      "formData",
    ],
    classificationLabels: [
      "advanced-feature",
      "tactical-user",
      "privacy-sensitive",
      "permission-sensitive",
      "connector-sensitive",
      "runtime-sensitive",
      "writes-settings",
      "benchmark-gap",
      "needs-integration-review",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Agent/developer products expose tool servers; consumer AI apps hide this behind connectors.",
    recommendedFutureAction:
      "Keep future Advanced Tools surface; add permission scopes before enabling sensitive tools.",
  },
  {
    tabId: "mcp-bridge",
    tabLabel: "MCP Bridge",
    sectionId: "share-luca-capabilities",
    sectionTitle: "Share Luca Capabilities",
    currentPurpose:
      "Display/copy outbound MCP bridge configuration, SSE URL, command, and access scope.",
    controls: [
      "transport mode",
      "copy config",
      "SSE URL",
      "local bridge command",
      "access scope",
    ],
    settingsKeysOrState: ["outbound MCP bridge UI state"],
    classificationLabels: [
      "advanced-feature",
      "tactical-user",
      "privacy-sensitive",
      "permission-sensitive",
      "connector-sensitive",
      "runtime-sensitive",
      "display-only",
      "writes-settings",
      "benchmark-gap",
      "origin-candidate",
    ],
    placementAssessment: "future-origin-only",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Sharing agent capabilities externally is beyond normal settings and can be creator/operator sensitive.",
    recommendedFutureAction:
      "Keep audit-only; future outbound capabilities need explicit governance and possibly Origin placement.",
  },
  {
    tabId: "iot",
    tabLabel: "Smart Home",
    sectionId: "home-assistant-connection",
    sectionTitle: "Home Assistant Connection",
    currentPurpose: "Configure smart-home server and token.",
    controls: ["Home Assistant URL field", "long-lived token field"],
    settingsKeysOrState: ["iot.haUrl", "iot.haToken"],
    classificationLabels: [
      "advanced-feature",
      "tactical-user",
      "privacy-sensitive",
      "permission-sensitive",
      "device-sensitive",
      "writes-settings",
      "benchmark-gap",
      "lucaos-differentiator",
      "needs-integration-review",
    ],
    placementAssessment: "move-to-advanced-later",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Smart-home device control is OS/assistant territory, not standard AI app settings.",
    recommendedFutureAction:
      "Move later under Devices/Connections with explicit device-control safety framing.",
  },
  {
    tabId: "connectors",
    tabLabel: "Connectors",
    sectionId: "connected-accounts",
    sectionTitle: "Connected Accounts",
    currentPurpose:
      "Connect messaging, workspace, and social accounts and configure persistence.",
    controls: [
      "WhatsApp",
      "Telegram",
      "Google Workspace",
      "X/Twitter",
      "Instagram",
      "LinkedIn",
      "YouTube",
      "Discord",
      "WeChat",
      "connect/auth buttons",
      "session persistence controls",
    ],
    settingsKeysOrState: [
      "connectors.<app>",
      "socialPersistence.<app>",
      "social status runtime state",
    ],
    classificationLabels: [
      "standard-user",
      "advanced-feature",
      "privacy-sensitive",
      "permission-sensitive",
      "connector-sensitive",
      "runtime-sensitive",
      "writes-settings",
      "benchmark-aligned",
      "needs-integration-review",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Connectors are benchmark-aligned, but browser automation/session persistence is more sensitive than typical OAuth app connections.",
    recommendedFutureAction:
      "Keep visible but add scopes, revocation, and data-use framing.",
  },
  {
    tabId: "data",
    tabLabel: "Data & Memory",
    sectionId: "overview-stats-export-wipe",
    sectionTitle: "Overview, Export, and Wipe",
    currentPurpose: "Show total facts, export memory JSON, and wipe memory.",
    controls: ["total facts", "export JSON", "wipe memory"],
    settingsKeysOrState: [
      "memoryStats.count",
      "LUCA_LUCA_ARCHIVE_V1",
      "memoryService",
    ],
    classificationLabels: [
      "standard-user",
      "privacy-sensitive",
      "memory-sensitive",
      "writes-settings",
      "benchmark-aligned",
      "needs-product-refinement",
      "good-current-placement",
    ],
    placementAssessment: "good-current-placement",
    integrationAssessment: "well-integrated",
    benchmarkComparison:
      "Data export/delete controls are expected in major AI apps.",
    recommendedFutureAction:
      "Keep top-level; continue improving confirmation and recovery language.",
  },
  {
    tabId: "data",
    tabLabel: "Data & Memory",
    sectionId: "memory-explorer",
    sectionTitle: "Memory Explorer",
    currentPurpose: "Search, filter, inspect, and delete individual memories.",
    controls: ["search", "category filter", "memory list", "delete memory"],
    settingsKeysOrState: [
      "memoryService.getAllMemories",
      "LUCA_LUCA_ARCHIVE_V1",
      "memory category filter state",
    ],
    classificationLabels: [
      "standard-user",
      "privacy-sensitive",
      "memory-sensitive",
      "writes-settings",
      "benchmark-aligned",
      "lucaos-differentiator",
      "good-current-placement",
    ],
    placementAssessment: "good-current-placement",
    integrationAssessment: "well-integrated",
    benchmarkComparison:
      "More transparent than many AI apps and valuable for trust.",
    recommendedFutureAction:
      "Keep and later add source/provenance and retention controls.",
  },
  {
    tabId: "data",
    tabLabel: "Data & Memory",
    sectionId: "session-cleanup",
    sectionTitle: "Session Cleanup",
    currentPurpose: "Reset active session state.",
    controls: ["reset active session"],
    settingsKeysOrState: ["active session state"],
    classificationLabels: [
      "standard-user",
      "privacy-sensitive",
      "runtime-sensitive",
      "writes-settings",
      "benchmark-aligned",
      "good-current-placement",
    ],
    placementAssessment: "good-current-placement",
    integrationAssessment: "well-integrated",
    benchmarkComparison: "Session cleanup is aligned with data controls.",
    recommendedFutureAction: "Keep with clearer consequences.",
  },
  {
    tabId: "knowledge-bridge",
    tabLabel: "Knowledge Base",
    sectionId: "local-knowledge-import",
    sectionTitle: "Local Knowledge Import",
    currentPurpose:
      "Import chat exports, IDE/dev data, JSON/CSV, and platform-specific knowledge files.",
    controls: [
      "category selector",
      "platform switcher",
      "file upload",
      "commence import",
      "progress panel",
      "insights logged",
    ],
    settingsKeysOrState: [
      "knowledge import UI state",
      "uploaded files",
      "import progress",
      "settingsService connector sync",
    ],
    classificationLabels: [
      "standard-user",
      "advanced-feature",
      "privacy-sensitive",
      "permission-sensitive",
      "memory-sensitive",
      "connector-sensitive",
      "runtime-sensitive",
      "writes-settings",
      "benchmark-aligned",
      "lucaos-differentiator",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "partially-integrated",
    benchmarkComparison:
      "Knowledge import is aligned with AI app data ingestion, but breadth is LucaOS-specific.",
    recommendedFutureAction:
      "Keep top-level; later separate standard imports from developer-context imports.",
  },
  {
    tabId: "knowledge-bridge",
    tabLabel: "Knowledge Base",
    sectionId: "saas-sync",
    sectionTitle: "SaaS Sync",
    currentPurpose:
      "Connect Notion, Google Drive, Obsidian, and future sync sources.",
    controls: [
      "Notion OAuth",
      "Notion page list",
      "Google Drive OAuth",
      "Drive file list",
      "Obsidian vault path",
      "sync all",
      "future connectors",
    ],
    settingsKeysOrState: [
      "connectors.notion",
      "connectors.google",
      "connectors.obsidian",
      "vaultPath",
      "SaaS sync runtime state",
    ],
    classificationLabels: [
      "advanced-feature",
      "privacy-sensitive",
      "permission-sensitive",
      "memory-sensitive",
      "connector-sensitive",
      "runtime-sensitive",
      "writes-settings",
      "benchmark-aligned",
      "needs-integration-review",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "needs-integration-review",
    benchmarkComparison:
      "Connectors/data ingestion are common, but local vault and workspace sync require strong scope framing.",
    recommendedFutureAction:
      "Keep but harmonize with Connectors so account connection state is not duplicated.",
  },
  {
    tabId: "about",
    tabLabel: "About",
    sectionId: "system-identity-status",
    sectionTitle: "System Identity & Status",
    currentPurpose:
      "Display LucaOS version, uptime, active model, architecture, voice, memory/cortex, and vision status.",
    controls: [
      "version",
      "uptime",
      "active model",
      "architecture",
      "voice provider",
      "memory/cortex status",
      "vision status",
    ],
    settingsKeysOrState: ["runtime display state", "settings display values"],
    classificationLabels: [
      "standard-user",
      "display-only",
      "benchmark-aligned",
      "good-current-placement",
    ],
    placementAssessment: "good-current-placement",
    integrationAssessment: "well-integrated",
    benchmarkComparison: "About/version and status are benchmark-aligned.",
    recommendedFutureAction:
      "Keep display-only; avoid adding self-update or release controls to normal Settings.",
  },
  {
    tabId: "about",
    tabLabel: "About",
    sectionId: "permissions-updates-links",
    sectionTitle: "Permissions & Updates Links",
    currentPurpose:
      "Provide display/link affordances for permissions and updates.",
    controls: ["permissions link", "updates link"],
    settingsKeysOrState: ["navigation/link state"],
    classificationLabels: [
      "standard-user",
      "permission-sensitive",
      "display-only",
      "benchmark-aligned",
      "needs-product-refinement",
    ],
    placementAssessment: "keep-visible-with-refinement",
    integrationAssessment: "partially-integrated",
    benchmarkComparison: "Expected support/about pattern.",
    recommendedFutureAction:
      "Keep links lightweight; any privileged update workflow belongs in future Origin.",
  },
  {
    tabId: "about",
    tabLabel: "About",
    sectionId: "labs-branding",
    sectionTitle: "LucaOS Labs Branding",
    currentPurpose: "Display Electron version and labs brand footer.",
    controls: ["Electron version", "LucaOS Labs footer"],
    settingsKeysOrState: ["environment/version display state"],
    classificationLabels: [
      "standard-user",
      "display-only",
      "benchmark-aligned",
    ],
    placementAssessment: "good-current-placement",
    integrationAssessment: "well-integrated",
    benchmarkComparison: "Standard about footer pattern.",
    recommendedFutureAction: "Keep display-only.",
  },
] as const satisfies readonly SettingsSectionArchitectureEntry[];

export const settingsSectionTabIds = Array.from(
  new Set(settingsSectionArchitectureMap.map((entry) => entry.tabId)),
);

export const settingsSensitiveSectionIds = settingsSectionArchitectureMap
  .filter((entry) =>
    entry.classificationLabels.some((label) =>
      [
        "privacy-sensitive",
        "permission-sensitive",
        "runtime-sensitive",
        "model-sensitive",
        "memory-sensitive",
        "voice-sensitive",
        "vision-sensitive",
        "device-sensitive",
        "connector-sensitive",
        "autonomy-sensitive",
      ].includes(label),
    ),
  )
  .map((entry) => `${entry.tabId}:${entry.sectionId}`);

export const settingsOriginCandidateSectionIds = settingsSectionArchitectureMap
  .filter((entry) =>
    (
      entry.classificationLabels as readonly SettingsSectionClassificationLabel[]
    ).includes("origin-candidate"),
  )
  .map((entry) => `${entry.tabId}:${entry.sectionId}`);

export const settingsBenchmarkGapSectionIds = settingsSectionArchitectureMap
  .filter((entry) =>
    (
      entry.classificationLabels as readonly SettingsSectionClassificationLabel[]
    ).includes("benchmark-gap"),
  )
  .map((entry) => `${entry.tabId}:${entry.sectionId}`);

export const settingsSectionArchitectureAuditNote =
  "This map is audit metadata only. It does not create, move, rename, hide, reorder, persist, or execute any Settings control. Origin/Creator Dashboard remains a future-only recommendation.";
