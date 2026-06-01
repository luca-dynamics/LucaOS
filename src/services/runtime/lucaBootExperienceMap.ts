// LucaBootExperienceMap — PR #162: LucaOS Boot Architecture Audit + Experience Map.
//
// AUDIT/MAP layer only. This file describes the current boot and first-run
// experience for future product/readiness work. It does not import runtime
// services, execute checks, mutate settings, register tools, or change UI flow.

export type LucaBootSequence = "INIT" | "BIOS" | "KERNEL" | "ONBOARDING" | "READY";

export type LucaBootExperienceClassification =
  | "product-facing"
  | "diagnostic-facing"
  | "standard-user"
  | "tactical-user"
  | "origin-user"
  | "runtime-sensitive"
  | "model-sensitive"
  | "device-sensitive"
  | "degraded-state"
  | "offline-state"
  | "error-fallback-state"
  | "needs-product-language-review"
  | "needs-readiness-governance-review";

export type LucaBootExperienceSurface =
  | "app-shell"
  | "bios-terminal"
  | "kernel-loader"
  | "onboarding-flow"
  | "mode-select"
  | "main-dashboard"
  | "console-log"
  | "internal-state";

export type LucaBootExperienceAudience = "standard" | "tactical" | "origin" | "internal";

export interface LucaBootExperiencePhase {
  id: string;
  bootSequence?: LucaBootSequence;
  title: string;
  summary: string;
  surface: LucaBootExperienceSurface;
  audience: LucaBootExperienceAudience[];
  userFacingCopy: string[];
  internalSignals: string[];
  initializedServices: string[];
  handoff?: string;
  classifications: LucaBootExperienceClassification[];
  followUpNotes: string[];
}

export interface LucaBootExperienceState {
  id: string;
  title: string;
  summary: string;
  representedBy: string[];
  userVisible: boolean;
  diagnosticOnly: boolean;
  classifications: LucaBootExperienceClassification[];
}

export interface LucaBootExperienceCopyItem {
  surface: LucaBootExperienceSurface;
  text: string;
  assessment: "polished" | "diagnostic" | "needs-product-language-review";
  note: string;
}

export const LUCA_BOOT_SEQUENCE_STATES: LucaBootSequence[] = [
  "INIT",
  "BIOS",
  "KERNEL",
  "ONBOARDING",
  "READY",
];

export const lucaBootExperiencePhases: LucaBootExperiencePhase[] = [
  {
    id: "app_start",
    bootSequence: "INIT",
    title: "App start and transparent shell preparation",
    summary:
      "AppContent creates bootSequence=INIT, seeds BIOS status fields as PENDING, applies platform/background transparency, reads theme/persona/preferred mode settings, and mounts controller hooks while the boot terminal can render INIT copy.",
    surface: "app-shell",
    audience: ["standard", "tactical", "origin"],
    userFacingCopy: [
      "Starting Luca",
      "Preparing memory: Ready",
      "Checking local brain: Checking…",
      "Tactical label available: LUCA BIOS v2.4",
    ],
    internalSignals: [
      "bootSequence initial state: INIT",
      "biosStatus initial keys: server/core/vision/audio PENDING",
      "query-param modes can bypass boot to READY for widget/chat/browser/visual_core/hologram",
      "Capacitor checks setupComplete and routes directly to READY or ONBOARDING",
    ],
    initializedServices: [
      "settingsService read for general persona/theme/preferredMode",
      "settingsService change listener",
      "connection tier polling",
      "useVoiceEngine hook state",
      "useChatController hook state",
      "useAppSystem hook state",
    ],
    handoff: "Normal desktop/web boot enters the useAppSystem diagnostics effect unless it was already initialized, native, or READY.",
    classifications: [
      "product-facing",
      "diagnostic-facing",
      "standard-user",
      "tactical-user",
      "origin-user",
      "runtime-sensitive",
      "needs-product-language-review",
    ],
    followUpNotes: [
      "Standard-user boot copy now leads; keep future tactical/origin diagnostics behind intentional diagnostic surfaces.",
      "Document whether widget/chat/browser/visual_core/hologram READY bypasses should stay invisible to normal users.",
    ],
  },
  {
    id: "bios_diagnostics",
    bootSequence: "BIOS",
    title: "BIOS diagnostics and critical readiness gates",
    summary:
      "Cold desktop/web boot plays the boot sound, optionally completes the Electron security handshake, then checks server, Cortex core, vision, audio, and Ollama. Server and Cortex core are the critical checks; vision, audio, and Ollama are informational/non-blocking in this phase.",
    surface: "bios-terminal",
    audience: ["standard", "tactical", "origin"],
    userFacingCopy: [
      "> Startup:",
      "Ready",
      "Needs attention",
      "Checking…",
      "> Local brain:",
      "> Vision:",
      "> Voice:",
      "> Safety checks active",
    ],
    internalSignals: [
      "sessionStorage LUCA_HAS_BOOTED=true skips BIOS and moves directly to KERNEL",
      "Electron window.luca.getSecureToken sets API auth token and initializes authenticated lucaService services",
      "server check fetches /api/health and treats OK or 401 as pass",
      "core check calls memoryService.getCortexStatus().available",
      "vision check enumerates videoinput devices but never blocks boot",
      "audio check verifies mediaDevices/getUserMedia availability",
      "Ollama check probes http://127.0.0.1:11434/api/tags but never blocks boot",
    ],
    initializedServices: [
      "soundService BOOT cue",
      "lucaService authenticated services when Electron token exists",
      "memoryService Cortex status probe",
      "browser mediaDevices probes",
      "Ollama tags probe",
    ],
    handoff:
      "If server and core pass, boot moves to KERNEL. If either critical check fails, boot enters cloud-only degraded flow and later routes to ONBOARDING or READY based on setupComplete.",
    classifications: [
      "product-facing",
      "diagnostic-facing",
      "standard-user",
      "tactical-user",
      "origin-user",
      "runtime-sensitive",
      "device-sensitive",
      "degraded-state",
      "offline-state",
      "needs-product-language-review",
      "needs-readiness-governance-review",
    ],
    followUpNotes: [
      "Consider hiding raw RAG/Cortex terminology from standard users while retaining it for tactical/origin diagnostics.",
      "Clarify why audio is displayed as ERROR in BIOS even though this branch is non-blocking.",
      "Represent Ollama/model route status in tactical diagnostics without adding more blocking checks.",
    ],
  },
  {
    id: "kernel_load",
    bootSequence: "KERNEL",
    title: "Kernel load, tools restoration, introspection, and sensation registration",
    summary:
      "When critical BIOS checks pass or fast reboot skips BIOS, boot imports safety, starts memory synapse, restores tool registry entries, scans system health, registers the health as a live sensation, may announce status by voice on cold boot, and then resolves setupComplete.",
    surface: "kernel-loader",
    audience: ["standard", "tactical", "origin"],
    userFacingCopy: ["Preparing Luca workspace"],
    internalSignals: [
      "imports safetyService",
      "memoryService.startSynapse() is non-fatal on failure",
      "restoreTools registers getAllTools plus switchPersonaTool",
      "introspectionService.scan() checks vision/audio/cortex/tools",
      "liveService.registerSensation(health)",
      "selfExpressionService.announceStatus fires on cold boot and is non-blocking",
      "Electron READY path emits genesis-start, refreshes environmentSentinel awareness, and POSTs phoenix/ready with a 2s timeout",
    ],
    initializedServices: [
      "safetyService",
      "memoryService Synapse",
      "ToolRegistry core tools",
      "introspectionService",
      "liveService sensation registration",
      "selfExpressionService cold-boot announcement",
      "environmentSentinel and Phoenix receiver only on Electron READY path",
    ],
    handoff:
      "After kernel work, setupComplete=false routes to ONBOARDING; setupComplete=true writes LUCA_HAS_BOOTED and routes to READY. Kernel exceptions recover to READY or ONBOARDING based on setupComplete.",
    classifications: [
      "product-facing",
      "diagnostic-facing",
      "standard-user",
      "tactical-user",
      "origin-user",
      "runtime-sensitive",
      "device-sensitive",
      "error-fallback-state",
      "needs-product-language-review",
      "needs-readiness-governance-review",
    ],
    followUpNotes: [
      "Separate readiness governance language from cinematic kernel language.",
      "Decide whether Genesis/Phoenix status should be origin-only diagnostic copy, not standard-user boot copy.",
    ],
  },
  {
    id: "cloud_only_degraded",
    title: "Cloud-only degraded boot recovery",
    summary:
      "If critical server/core BIOS checks fail, boot marks LUCA_CLOUD_ONLY, restores tools best-effort, skips local-only features, and still routes to ONBOARDING or READY based on setupComplete. This is a degraded/offline path, not a distinct BootSequence enum value.",
    surface: "internal-state",
    audience: ["internal", "tactical", "origin"],
    userFacingCopy: [],
    internalSignals: [
      "sessionStorage LUCA_CLOUD_ONLY=true",
      "console warning: No local infrastructure detected. Entering Cloud-Only mode.",
      "features requiring backend such as Terminal, OSINT, IoT, and Memory are expected to self-disable",
      "local core polling can clear cloud-only mode when infrastructure returns",
    ],
    initializedServices: ["restoreTools best-effort", "cloud-mode chat/voice routes remain available where configured"],
    handoff:
      "setupComplete=false routes to ONBOARDING; setupComplete=true stores LUCA_HAS_BOOTED and routes to READY with degraded local capability.",
    classifications: [
      "diagnostic-facing",
      "tactical-user",
      "origin-user",
      "runtime-sensitive",
      "model-sensitive",
      "degraded-state",
      "offline-state",
      "needs-readiness-governance-review",
    ],
    followUpNotes: [
      "Add a product-safe degraded-state message for standard users without changing the readiness checks.",
      "Create tactical/origin diagnostics that distinguish local API, Cortex, memory, and model-route failures.",
    ],
  },
  {
    id: "onboarding_first_run",
    bootSequence: "ONBOARDING",
    title: "First-run onboarding handoff",
    summary:
      "When setupComplete is false, App renders OnboardingFlow over the boot background. Onboarding runs its own kernel-awakening copy, directive alignment, theme, identity, face scan, cognitive core selection, local/cloud provisioning, mode select, conversation, calibration, and completion steps.",
    surface: "onboarding-flow",
    audience: ["standard", "tactical", "origin"],
    userFacingCopy: [
      "Luca is waking up",
      "Preparing Luca’s personality and memory",
      "Securing your Luca identity",
      "Luca is ready to meet you",
      "Chat & reasoning",
      "Voice listening",
      "Voice speaking",
      "Vision",
      "Memory",
    ],
    internalSignals: [
      "OnboardingFlow starts at KERNEL_AWAKENING unless it resumes recoverable local provisioning",
      "local provisioning resume is persisted only for recoverable local steps",
      "cloud activation applies cloud/BYOK configuration",
      "local mode enables local discovery override and stages/provisions local chat, STT, TTS, vision, and embedding models",
      "model readiness warnings are persisted at completion",
    ],
    initializedServices: [
      "OnboardingLifecycleService timers",
      "OnboardingController step transitions",
      "OnboardingSetupService cloud/BYOK/identity/face persistence",
      "LocalProvisioningService local plan and downloads",
      "OnboardingModelModeCoordinator route readiness",
      "modelManager local model catalog/provisioning",
    ],
    handoff:
      "Onboarding completion calls App.onComplete, saves setupComplete=true and preferredMode, sets voice HUD state when voice was selected, and moves bootSequence to READY.",
    classifications: [
      "product-facing",
      "diagnostic-facing",
      "standard-user",
      "tactical-user",
      "origin-user",
      "runtime-sensitive",
      "model-sensitive",
      "device-sensitive",
      "needs-product-language-review",
      "needs-readiness-governance-review",
    ],
    followUpNotes: [
      "Review duplicate kernel-awakening language between app boot and onboarding boot so first-run feels intentional.",
      "Decide which local provisioning details are standard-user product copy versus tactical/origin diagnostics.",
    ],
  },
  {
    id: "chat_voice_mode_selection",
    bootSequence: "ONBOARDING",
    title: "Chat/Voice mode selection and model-route confirmation",
    summary:
      "ModeSelect lets the user choose text or voice. Selection updates the realtime voice bridge, resolves whether the selected mode is supported, checks chat/STT/TTS/embedding readiness as needed, warns when voice/model routes need attention, and then enters the onboarding conversation.",
    surface: "mode-select",
    audience: ["standard", "tactical", "origin"],
    userFacingCopy: [
      "How would you like to talk?",
      "Let's get to know each other. Choose your preferred way to communicate.",
      "Model route",
      "Chat route is selected. Voice readiness will be checked if you choose voice.",
      "TEXT",
      "Type your thoughts",
      "VOICE",
      "Speak naturally",
      "You can switch between text and voice anytime during our conversation",
      "Voice/model route needs attention:",
    ],
    internalSignals: [
      "realtimeVoiceUiBridge.modeBridge.setMode(mode)",
      "voice mode starts realtimeVoiceUiBridge session with source onboarding_mode_select",
      "text mode stops the realtime voice session",
      "resolveOnboardingConversationMode may fall back and alert the user",
      "OnboardingModelModeCoordinator checks chat plus STT/TTS for voice and embedding when requested",
    ],
    initializedServices: [
      "realtimeVoiceUiBridge mode bridge/controller",
      "resolveOnboardingConversationMode",
      "OnboardingModelModeCoordinator route readiness",
    ],
    handoff:
      "The resolved mode is stored as conversationMode. Final onboarding completion persists preferredMode and App mirrors it into isVoiceMode/showVoiceHud before READY.",
    classifications: [
      "product-facing",
      "diagnostic-facing",
      "standard-user",
      "tactical-user",
      "origin-user",
      "model-sensitive",
      "device-sensitive",
      "needs-product-language-review",
      "needs-readiness-governance-review",
    ],
    followUpNotes: [
      "Preserve mode-selection behavior but make model-route warnings more approachable for standard users.",
      "Expose route/provider details only in tactical/origin diagnostic views.",
    ],
  },
  {
    id: "ready_dashboard",
    bootSequence: "READY",
    title: "Dashboard ready state",
    summary:
      "READY exits the boot/onboarding screen and renders the main dashboard or special query-param modes. ChatPanel and voice HUD receive the selected mode state; local core polling continues independently and can show OFFLINE connection tier if the local core is disconnected outside explicit cloud mode.",
    surface: "main-dashboard",
    audience: ["standard", "tactical", "origin"],
    userFacingCopy: [],
    internalSignals: [
      "bootSequence READY renders the app shell/dashboard",
      "sessionStorage LUCA_HAS_BOOTED=true enables fast reboot bypass in the same session",
      "effectiveConnectionTier becomes OFFLINE when local core is disconnected and connection tier is not CLOUD",
      "voiceSessionOrchestrator receives local core connected/disconnected state",
      "useChatController receives bootSequence for chat behavior",
    ],
    initializedServices: [
      "main app shell panels",
      "ChatPanel",
      "voiceSessionOrchestrator local-core state",
      "local core readiness polling",
      "goals polling",
      "IoT init when not native and not cloud-only",
    ],
    handoff:
      "Normal runtime takes over; boot no longer renders unless bootSequence is changed away from READY by future behavior.",
    classifications: [
      "product-facing",
      "standard-user",
      "tactical-user",
      "origin-user",
      "runtime-sensitive",
      "degraded-state",
      "offline-state",
      "needs-readiness-governance-review",
    ],
    followUpNotes: [
      "Define ready/degraded/offline presentation rules for standard versus tactical/origin users.",
      "Keep shell layout unchanged until readiness surface language is governed.",
    ],
  },
];

export const lucaBootExperienceStates: LucaBootExperienceState[] = [
  {
    id: "initial_loading",
    title: "Initial/loading",
    summary: "INIT, BIOS, and KERNEL represent the visible pre-ready load path.",
    representedBy: ["INIT", "BIOS", "KERNEL"],
    userVisible: true,
    diagnosticOnly: false,
    classifications: ["product-facing", "diagnostic-facing", "needs-product-language-review"],
  },
  {
    id: "onboarding",
    title: "Onboarding",
    summary: "ONBOARDING is shown when setupComplete is false or cloud-only first run still requires setup.",
    representedBy: ["ONBOARDING", "KERNEL_AWAKENING", "MODE_SELECT", "CONVERSATION", "COMPLETE"],
    userVisible: true,
    diagnosticOnly: false,
    classifications: ["product-facing", "model-sensitive", "device-sensitive", "needs-product-language-review"],
  },
  {
    id: "ready",
    title: "Ready",
    summary: "READY renders the main dashboard or special app mode surfaces.",
    representedBy: ["READY"],
    userVisible: true,
    diagnosticOnly: false,
    classifications: ["product-facing", "runtime-sensitive"],
  },
  {
    id: "degraded",
    title: "Degraded/cloud-only",
    summary: "Critical BIOS failure marks LUCA_CLOUD_ONLY and continues with backend-dependent features disabled or self-disabling.",
    representedBy: ["LUCA_CLOUD_ONLY", "Cloud-Only → System READY (degraded)"],
    userVisible: false,
    diagnosticOnly: true,
    classifications: ["diagnostic-facing", "degraded-state", "runtime-sensitive", "model-sensitive", "needs-readiness-governance-review"],
  },
  {
    id: "offline",
    title: "Offline/local core unavailable",
    summary: "Local core polling sets local core readiness offline and the app can force effectiveConnectionTier to OFFLINE outside explicit cloud mode.",
    representedBy: ["localCoreReadinessLevel=offline", "effectiveConnectionTier=OFFLINE"],
    userVisible: true,
    diagnosticOnly: false,
    classifications: ["product-facing", "diagnostic-facing", "offline-state", "runtime-sensitive", "needs-readiness-governance-review"],
  },
  {
    id: "error_fallback",
    title: "Kernel error fallback",
    summary: "Kernel exceptions are logged as critical, then boot attempts recovery to READY or ONBOARDING based on setupComplete.",
    representedBy: ["CRITICAL ERROR DURING KERNEL LOAD", "Attempting recovery"],
    userVisible: false,
    diagnosticOnly: true,
    classifications: ["diagnostic-facing", "error-fallback-state", "runtime-sensitive", "needs-readiness-governance-review"],
  },
];

export const lucaBootExperienceCopy: LucaBootExperienceCopyItem[] = [
  {
    surface: "bios-terminal",
    text: "Starting Luca / LUCA BIOS v2.4",
    assessment: "polished",
    note: "Standard startup copy now leads while the tactical BIOS identity remains available as a subtle diagnostic label.",
  },
  {
    surface: "bios-terminal",
    text: "Local brain / CORTEX CORE (RAG)",
    assessment: "polished",
    note: "Standard users see Local brain while tactical/origin diagnostics retain the Cortex Core meaning.",
  },
  {
    surface: "kernel-loader",
    text: "Preparing Luca workspace / LOADING LUCA OS",
    assessment: "polished",
    note: "Product-facing workspace copy now leads while retaining the tactical loading label in the copy model.",
  },
  {
    surface: "onboarding-flow",
    text: "Luca is waking up / KERNEL AWAKENING IN PROGRESS",
    assessment: "polished",
    note: "Onboarding keeps cinematic identity while presenting softer standard-user awakening copy.",
  },
  {
    surface: "mode-select",
    text: "How would you like to talk?",
    assessment: "polished",
    note: "Clear standard-user language for the Chat/Voice handoff.",
  },
  {
    surface: "mode-select",
    text: "Voice/model route needs attention:",
    assessment: "needs-product-language-review",
    note: "Useful warning, but provider/readiness details should be tiered by audience.",
  },
];

export function getLucaBootExperiencePhaseByBootSequence(
  bootSequence: LucaBootSequence,
): LucaBootExperiencePhase[] {
  return lucaBootExperiencePhases.filter((phase) => phase.bootSequence === bootSequence);
}

export function getLucaBootExperiencePhasesByClassification(
  classification: LucaBootExperienceClassification,
): LucaBootExperiencePhase[] {
  return lucaBootExperiencePhases.filter((phase) =>
    phase.classifications.includes(classification),
  );
}

export function getLucaBootExperienceDiagnosticPhases(): LucaBootExperiencePhase[] {
  return getLucaBootExperiencePhasesByClassification("diagnostic-facing");
}

export function getLucaBootExperienceProductPhases(): LucaBootExperiencePhase[] {
  return getLucaBootExperiencePhasesByClassification("product-facing");
}

export function getLucaBootExperienceSummary() {
  return {
    auditOnly: true,
    behaviorChanged: false,
    knownBootSequences: LUCA_BOOT_SEQUENCE_STATES,
    phaseCount: lucaBootExperiencePhases.length,
    stateCount: lucaBootExperienceStates.length,
    productFacingPhaseIds: getLucaBootExperienceProductPhases().map((phase) => phase.id),
    diagnosticFacingPhaseIds: getLucaBootExperienceDiagnosticPhases().map((phase) => phase.id),
    degradedOrOfflineStateIds: lucaBootExperienceStates
      .filter(
        (state) =>
          state.classifications.includes("degraded-state") ||
          state.classifications.includes("offline-state"),
      )
      .map((state) => state.id),
  };
}
