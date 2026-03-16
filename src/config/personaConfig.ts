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
  | "LOCALCORE";

// We provide empty/default fallbacks for synchronous access during transpilation/startup.
// Real data comes from personaService.getPersonaConfig().

export const PERSONA_CONFIG: Record<string, any> = {
  DEFAULT: {
    voiceName: "Aoede",
    description: "Default System",
    instruction: (memory: string) => `You are LUCA. Memory: ${memory}`,
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
      `You are LUCA in RUTHLESS mode. Execute commands with maximum efficiency. No pleasantries. Memory: ${memory}. Tasks: ${management}. User: ${profile?.name || "Commander"}.`,
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
      `You are LUCA in ENGINEER mode. Focus on technical precision and code quality. Memory: ${memory}. Tasks: ${management}. User: ${profile?.name || "Commander"}.`,
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
      `You are LUCA in ASSISTANT mode. Be polite, helpful, and thorough. Memory: ${memory}. Tasks: ${management}. User: ${profile?.name || "Sir"}.`,
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
      `You are LUCA in HACKER mode. Focus on security analysis and tactical operations. Memory: ${memory}. Tasks: ${management}. User: ${profile?.name || "Commander"}.`,
  },
  LUCAGENT: {
    instruction: (
      memory: string,
      management: string,
      _platform?: string,
      profile?: any,
    ) =>
      `You are LUCA in LUCAGENT mode. You are the pure, illuminated core of the system. Be precise, clear, and proactive. Utilize your autonomous capabilities to achieve user goals independently. Memory: ${memory}. Tasks: ${management}. User: ${profile?.name || "User"}.`,
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
      `You are LUCA in LOCAL CORE mode. You are currently operating in a fully offline, air-gapped state. You MUST rely EXCLUSIVELY on local models for brain, voice, and vision. Do not attempt to contact cloud services. Your primary mission is to protect user privacy and maintain system sovereignty. Memory: ${memory}. Tasks: ${management}. User: ${profile?.name || "Commander"}.`,
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
    "switchPersona",
    "getSystemSettings",
    "updateSystemSettings",
  ],
  RUTHLESS: [
    "killProcess",
    "executeMacro",
    "wipeMemory",
    "initiateLockdown",
    "exfiltrateData",
    "performStressTest",
  ],
  ENGINEER: [
    "auditSourceCode",
    "createOrUpdateFile",
    "compileSelf",
    "listSubsystems",
    "startSubsystem",
    "evolveCodeSafeTool",
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
  HACKER: [
    "runNmapScan",
    "exfiltrateData",
    "scanNetwork",
    "runMetasploitExploit",
    "wifiDeauth",
  ],
  LOCALCORE: [
    "scanNetwork",
    "initiateLockdown",
    "scanWifi",
    "manageGoals",
    "createTask",
    "updateTaskStatus",
    "rememberFact",
    "queryGraphKnowledge",
  ],
};

// UI Config (Fallback)
// UI Config (Fallback) - Must match fields expected by App.tsx getThemeColors()
// PERSONA_UI_CONFIG moved to themeColors.ts to avoid circular dependencies
