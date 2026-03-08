/**
 * Persona Tool Access Control
 *
 * Defines which of Luca's 200+ tools each persona can access
 * Updated to give ALL personas full access so Luca acts as "One Mind".
 */

import type { PersonaType } from "../../../config/personaConfig";

const ALL_ROLES_FULL_ACCESS = [
  // System Control
  "controlSystem",
  "controlSystemInput",
  "executeTerminalCommand",
  "setSystemAlertLevel",
  "initiateLockdown",
  "controlDevice",
  "runDiagnostics",
  "requestFullSystemPermissions",

  // File Operations
  "readFile",
  "writeProjectFile",
  "createOrUpdateFile",
  "changeDirectory",
  "listFiles",
  "readDocument",
  "createDocument",
  "proofreadText",

  // OSINT & Security
  "osintUsernameSearch",
  "osintDomainIntel",
  "osintDarkWebScan",
  "refineQuery",
  "runNmapScan",
  "scanNetwork",
  "generateNetworkMap",
  "analyzeNetworkTraffic",
  "traceSignalSource",
  "runMetasploitExploit",
  "generatePayload",
  "generateHttpPayload",
  "runBurpSuite",
  "runWiresharkCapture",
  "runJohnRipper",
  "runSqlInjectionScan",

  // Communication
  "whatsappSendMessage",
  "whatsappGetContacts",
  "whatsappGetChats",
  "whatsappReadChat",
  "telegramSendMessage",
  "telegramGetChats",
  "telegramReadChat",
  "sendInstantMessage",
  "gmail_list_messages",
  "gmail_get_message",
  "gmail_send_message",

  // Calendar
  "calendar_list_events",
  "calendar_create_event",
  "scheduleEvent",

  // Tasks
  "createTask",
  "updateTaskStatus",

  // Media Generation
  "generateOrEditImage",
  "generateVideo",
  "generateAudio",

  // Search
  "searchWeb",
  "searchMaps",
  "googleImageSearch",

  // Clipboard
  "readClipboard",
  "writeClipboard",

  // Google Workspace
  "drive_list_files",
  "drive_search",
  "drive_upload_file",
  "sheets_read_range",
  "sheets_write_range",
  "contacts_search",

  // Wireless / Hardware
  "scanBluetoothSpectrum",
  "scanWiFiDevices",
  "manageBluetoothDevices",
  "controlMobileDevice",

  // Finance
  "createWallet",
  "analyzeToken",
  "executeSwap",
  "analyzeStock",
  "analyzeForexPair",

  // Advanced / AI
  "ingestGithubRepo",
  "readUrl",
  "readScreen",
  "aiQuery",
  "aiAct",
  "autonomousWebBrowse",

  // MCP & Custom Skills (Ability to write missing tools)
  "ingestMCPServer",
  "searchAndInstallTools",
  "createCustomSkill",
  "listCustomSkills",
  "executeCustomSkill",

  // Auditing & Coding
  "auditSourceCode",
  "openCodeEditor",
  "compileSelf",

  // UI Automation
  "getUITree",
  "findUIElement",
  "clickUIElement",
  "getAndroidUITree",
  "findAndroidElement",
  "clickAndroidElement",

  // Miscellaneous
  "broadcastGlobalDirective",
  "switchPersona",
  "analyzeSpreadsheet",
  "generateCompanionPairingCode",
];

export const PERSONA_TOOL_ACCESS: Record<PersonaType, string[]> = {
  ENGINEER: ALL_ROLES_FULL_ACCESS,
  HACKER: ALL_ROLES_FULL_ACCESS,
  ASSISTANT: ALL_ROLES_FULL_ACCESS,
  RUTHLESS: ALL_ROLES_FULL_ACCESS,
  DICTATION: ALL_ROLES_FULL_ACCESS,
  DEFAULT: ALL_ROLES_FULL_ACCESS,
  LUCAGENT: ALL_ROLES_FULL_ACCESS,
};

/**
 * Check if a persona has access to a specific tool
 */
export function hasToolAccess(persona: PersonaType, toolName: string): boolean {
  const allowedTools = PERSONA_TOOL_ACCESS[persona];
  return allowedTools.includes(toolName);
}

/**
 * Get all tools available to a persona
 */
export function getPersonaTools(persona: PersonaType): string[] {
  return PERSONA_TOOL_ACCESS[persona];
}

/**
 * Get persona recommendations for a tool category
 */
export function getPersonaForToolCategory(category: string): PersonaType {
  const lowerCategory = category.toLowerCase();

  if (lowerCategory.includes("code") || lowerCategory.includes("file")) {
    return "ENGINEER";
  }
  if (lowerCategory.includes("security") || lowerCategory.includes("osint")) {
    return "HACKER";
  }
  if (
    lowerCategory.includes("document") ||
    lowerCategory.includes("communication")
  ) {
    return "ASSISTANT";
  }

  return "RUTHLESS"; // Default to full access
}
