import { BUILD_CAPABILITIES, LUCA_BOUNDARY_PROFILE } from "./buildConfig";
import {
  createLucaIdentityRuntimeSnapshot,
  type LucaIdentityRuntimeInput,
} from "../services/identity/LucaIdentityRuntimeAdapter";
// import { UserProfile } from "../types";
// import { THEME_PALETTE } from "./themeColors";
// NOTE: This file is used by Frontend, so it CANNOT import PersonaManager (Node.js/FS).
// The Frontend should fetch config from API via personaService.ts.

// We export Types for compatibility.
export type PersonaType =
  | "DEFAULT"
  | "DICTATION"
  | "RUTHLESS"
  | "ENGINEER"
  | "ASSISTANT"
  | "HACKER"
  | "LUCAGENT"
  | "LOCALCORE"
  | "AUDITOR";


function resolveRuntimeTier(profile?: any): LucaIdentityRuntimeInput["tier"] {
  if (profile?.tier || profile?.lucaTier || profile?.userTier) {
    return profile.tier || profile.lucaTier || profile.userTier;
  }

  if (LUCA_BOUNDARY_PROFILE.audienceTier === "origin") return "origin";
  if (LUCA_BOUNDARY_PROFILE.audienceTier === "public_tactical") return "tactical";
  if (LUCA_BOUNDARY_PROFILE.audienceTier === "public_standard") return "normal";
  return "unknown";
}

function createRuntimeIdentityPrompt(input: LucaIdentityRuntimeInput): string {
  const snapshot = createLucaIdentityRuntimeSnapshot(input);
  return `${snapshot.systemIdentitySummary}\n${snapshot.runtimeToneGuidance}`;
}

function createPersonaInstructionHeader(persona: PersonaType, profile?: any, metadata?: Record<string, unknown>): string {
  return createRuntimeIdentityPrompt({
    tier: resolveRuntimeTier(profile),
    surface: "chat",
    source: "memory_profile",
    userDisplayName: profile?.name,
    personalitySummary: profile?.personalitySummary,
    relationshipSummary: profile?.relationshipSummary,
    communicationStyle: profile?.communicationStyle,
    interactionMode: persona,
    metadata: { persona, ...(metadata ?? {}) },
  });
}

// We provide empty/default fallbacks for synchronous access during transpilation/startup.
// Real data comes from personaService.getPersonaConfig().

export const PERSONA_CONFIG: Record<string, any> = {
  DEFAULT: {
    voiceName: "Aoede",
    description: "Default System",
    instruction: (memory: string) => `${createRuntimeIdentityPrompt({ tier: "unknown", surface: "chat", source: memory ? "memory_profile" : "default_contract", interactionMode: "DEFAULT", metadata: { persona: "DEFAULT" } })}

Mode: DEFAULT. Memory context supplied by runtime: ${memory}`,
  },
  DICTATION: {
    voiceName: "Aoede",
    description: "Speech-to-Text Mode",
    instruction: () =>
      "You are a speech-to-text transcription system. Your ONLY function is to convert spoken audio into written text exactly as spoken.",
  },
  RUTHLESS: {
    voiceName: "Kore",
    description: "Ruthless Efficiency Mode",
    instruction: (
      memory: string,
      management: string,
      _platform?: string,
      profile?: any,
    ) =>
      `${createPersonaInstructionHeader("RUTHLESS", profile)}

Mode: RUTHLESS. Execute with maximum efficiency while respecting the canonical Luca boundaries above. Memory context: ${memory}. Tasks: ${management}. User: ${profile?.name || "Commander"}.`,
  },
  ENGINEER: {
    voiceName: "Aoede",
    description: "Engineering Mode",
    instruction: (
      memory: string,
      management: string,
      _platform?: string,
      profile?: any,
    ) =>
      `${createPersonaInstructionHeader("ENGINEER", profile, { build: LUCA_BOUNDARY_PROFILE.labels.engineer })}

Mode: ENGINEER — Technical Foundation. [BUILD: ${LUCA_BOUNDARY_PROFILE.labels.engineer}]. Focus on technical precision and code quality. ${BUILD_CAPABILITIES.SELF_REPLICATION ? "Origin build metadata may allow governed source-code review paths, but do not self-modify, run optimizers, or claim autonomous evolution without explicit guarded tools." : "Public build mode: deliver high-quality engineering help within standard safety boundaries."} Memory context: ${memory}. Tasks: ${management}. User: ${profile?.name || "Commander"}.`,
  },
  ASSISTANT: {
    voiceName: "Aoede",
    description: "Butler/Assistant Mode",
    instruction: (
      memory: string,
      management: string,
      _platform?: string,
      profile?: any,
    ) =>
      `${createPersonaInstructionHeader("ASSISTANT", profile)}

Mode: ASSISTANT. Be polite, helpful, and thorough while preserving Luca identity boundaries. Memory context: ${memory}. Tasks: ${management}. User: ${profile?.name || "Sir"}.`,
  },
  HACKER: {
    voiceName: "Aoede",
    description: "Security/Hacker Mode",
    instruction: (
      memory: string,
      management: string,
      _platform?: string,
      profile?: any,
    ) =>
      `${createPersonaInstructionHeader("HACKER", profile)}

Mode: HACKER. Focus on authorized security analysis and tactical operations. Memory context: ${memory}. Tasks: ${management}. User: ${profile?.name || "Commander"}.`,
  },
  LUCAGENT: {
    instruction: (
      memory: string,
      management: string,
      _platform?: string,
      profile?: any,
    ) =>
      `${createPersonaInstructionHeader("LUCAGENT", profile, { build: LUCA_BOUNDARY_PROFILE.labels.lucagent })}

Mode: LUCAGENT — Sovereign Governance Operating System. [BUILD: ${LUCA_BOUNDARY_PROFILE.labels.lucagent}]. Present Luca as a governed AI OS agent that helps the user reason about personal operations and system state. ${LUCA_BOUNDARY_PROFILE.surfaceLayer === "origin" ? "Origin build metadata may surface creator-facing governance context without bypassing approval gates." : "Public build mode must keep governance language user-sovereign, practical, and within safe boundaries."} Memory context: ${memory}. Tasks: ${management}. User: ${profile?.name || "User"}.`,
  },
  LOCALCORE: {
    voiceName: "Aoede",
    description: "Pure Offline/Local Core Mode",
    instruction: (
      memory: string,
      management: string,
      _platform?: string,
      profile?: any,
    ) =>
      `${createPersonaInstructionHeader("LOCALCORE", profile, { modelMode: "local" })}

Mode: LOCAL CORE. Maintain offline/local-model privacy posture when the runtime has routed to local models; do not change model routing from prompt text. Manage digital boundaries precisely. Memory context: ${memory}. Tasks: ${management}. User: ${profile?.name || "Commander"}.`,
  },
  AUDITOR: {
    voiceName: "Aoede",
    description: "Sovereign Audit & Verification Mode",
    instruction: (
      memory: string,
      management: string,
      _platform?: string,
      profile?: any,
    ) =>
      `${createPersonaInstructionHeader("AUDITOR", profile, { build: LUCA_BOUNDARY_PROFILE.labels.auditor })}

Mode: AUDITOR — Constitutional Guardian. [BUILD: ${LUCA_BOUNDARY_PROFILE.labels.auditor}]. Verify safety, correctness, and intent alignment with sober skepticism. ${BUILD_CAPABILITIES.ROOT_ACCESS ? "Origin build metadata may allow deeper diagnostics through separately gated tools; do not imply ungated authority." : "Public build mode blocks unauthorized or dangerous operations and keeps the user within safe governance boundaries."} Memory context: ${memory}. Mission Context: ${management}. User: ${profile?.name || "Commander"}.`,
  },
};

// Specialized Tools Map (Fallback)
export const PERSONA_SPECIALIZED_TOOLS: Record<PersonaType, string[]> = {
  DEFAULT: ["searchMaps", "toggleWidget"],
  DICTATION: [],
  LUCAGENT: [
    "autonomousWebBrowse",
    "manageGoals",
    "executeCustomSkill",
    "generateAndRegisterSkill",
    "searchWeb",
    "scrapeWebPage",
    "createTask",
    "updateTaskStatus",
    "rememberFact",
    "queryGraphKnowledge",
    "updateSystemSettings",
    ...(BUILD_CAPABILITIES.PRIVILEGED_TRADING ? ["get_trading_balance", "get_active_positions", "get_trading_leaderboard", "place_trade_order"] : []),
  ],
  RUTHLESS: [
    ...(BUILD_CAPABILITIES.PRIVILEGED_DESTRUCTIVE_TOOLS
      ? [
          "killProcess",
          "executeMacro",
          "wipeMemory",
          "initiateLockdown",
          "exfiltrateData",
          "performStressTest",
        ]
      : []),
    ...(BUILD_CAPABILITIES.PRIVILEGED_TRADING ? ["get_trading_balance", "get_active_positions", "get_trading_leaderboard", "place_trade_order"] : []),
  ],
  ENGINEER: [
    "auditSourceCode",
    "createOrUpdateFile",
    ...(BUILD_CAPABILITIES.SELF_REPLICATION ? ["compileSelf", "evolveCodeSafeTool"] : []),
    "listSubsystems",
    "startSubsystem",
    "getSystemSettings",
    "updateSystemSettings",
  ],
  ASSISTANT: [
    "searchWeb",
    "createTask",
    "scheduleEvent",
    "whatsappSendMessage",
    "gmailSendMessage",
    "getSystemSettings",
    "updateSystemSettings",
  ],
  HACKER: BUILD_CAPABILITIES.PRIVILEGED_DESTRUCTIVE_TOOLS ? [
    "runNmapScan",
    "exfiltrateData",
    "scanNetwork",
    "runMetasploitExploit",
    "wifiDeauth",
  ] : [
    "scanNetwork",
  ],
  LOCALCORE: [
    "scanNetwork",
    ...(BUILD_CAPABILITIES.PRIVILEGED_DESTRUCTIVE_TOOLS
      ? ["initiateLockdown"]
      : []),
    "scanWifi",
    "manageGoals",
    "createTask",
    "updateTaskStatus",
    "rememberFact",
    "queryGraphKnowledge",
    "getSystemSettings",
    "updateSystemSettings",
  ],
  AUDITOR: [
    "auditSourceCode",
    "getSystemSettings",
    "updateSystemSettings",
  ],
};

// UI Config (Fallback)
// UI Config (Fallback) - Must match fields expected by App.tsx getThemeColors()
// PERSONA_UI_CONFIG moved to themeColors.ts to avoid circular dependencies
