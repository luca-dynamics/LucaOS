/**
 * Persona Tool Access Control
 *
 * The workforce should not assume every persona sees the same tool universe.
 * Runtime registration remains the primary source of truth, while this layer
 * expresses which classes of tools each persona is allowed to reason about.
 */

import {
  BUILD_CAPABILITIES,
} from "../../../config/buildConfig";
import {
  PERSONA_SPECIALIZED_TOOLS,
  type PersonaType,
} from "../../../config/personaConfig";

const SHARED_BASE_TOOLS = [
  "searchWeb",
  "searchMaps",
  "googleImageSearch",
  "createTask",
  "updateTaskStatus",
  "scheduleEvent",
  "readFile",
  "listFiles",
  "readDocument",
  "proofreadText",
  "readClipboard",
  "writeClipboard",
  "getSystemSettings",
  "updateSystemSettings",
  "controlSystem",
  "system_doctor",
  "runDiagnostics",
  "rememberFact",
  "queryGraphKnowledge",
  "storeMemory",
  "retrieveMemory",
  "reconcileMemories",
  "addGraphRelations",
  "switchPersona",
];

const ASSISTANT_TOOLS = [
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
  "drive_list_files",
  "drive_search",
  "drive_upload_file",
  "sheets_read_range",
  "sheets_write_range",
  "contacts_search",
];

const ENGINEER_TOOLS = [
  "writeProjectFile",
  "createOrUpdateFile",
  "changeDirectory",
  "createDocument",
  "analyzeSpreadsheet",
  "auditSourceCode",
  "openCodeEditor",
  "executeTerminalCommand",
  "listSubsystems",
  "startSubsystem",
  "ingestGithubRepo",
  "ingestMCPServer",
  "searchAndInstallTools",
  ...(BUILD_CAPABILITIES.SELF_REPLICATION
    ? ["compileSelf", "evolveCodeSafeTool"]
    : []),
];

const HACKER_TOOLS = [
  "osintUsernameSearch",
  "osintDomainIntel",
  "refineQuery",
  "scanNetwork",
  ...(BUILD_CAPABILITIES.PRIVILEGED_DESTRUCTIVE_TOOLS
    ? [
        "osintDarkWebScan",
        "traceSignalSource",
        "runNmapScan",
        "generateNetworkMap",
        "analyzeNetworkTraffic",
        "runMetasploitExploit",
        "generatePayload",
        "generateHttpPayload",
        "runBurpSuite",
        "runWiresharkCapture",
        "runJohnRipper",
        "runSqlInjectionScan",
        "exfiltrateData",
        "performStressTest",
        "wifiDeauth",
      ]
    : []),
];

const AUTONOMY_TOOLS = [
  "manageGoals",
  "autonomousWebBrowse",
  "openAutonomyDashboard",
  "createCustomSkill",
  "generateAndRegisterSkill",
  "executeCustomSkill",
  "listCustomSkills",
  "executeRpcScript",
];

const LOCAL_DEVICE_TOOLS = [
  "readUrl",
  "readScreen",
  "aiQuery",
  "aiAct",
  "getUITree",
  "findUIElement",
  "clickUIElement",
  "getAndroidUITree",
  "findAndroidElement",
  "clickAndroidElement",
  "scanBluetoothSpectrum",
  "scanWiFiDevices",
  "manageBluetoothDevices",
  "controlMobileDevice",
  "generateCompanionPairingCode",
];

const FINANCE_TOOLS = [
  ...(BUILD_CAPABILITIES.PRIVILEGED_TRADING
    ? [
        "createWallet",
        "analyzeToken",
        "executeSwap",
        "analyzeStock",
        "analyzeForexPair",
        "get_trading_balance",
        "get_active_positions",
        "get_trading_leaderboard",
        "place_trade_order",
      ]
    : []),
];

const DESTRUCTIVE_TOOLS = [
  ...(BUILD_CAPABILITIES.PRIVILEGED_DESTRUCTIVE_TOOLS
    ? [
        "initiateLockdown",
        "killProcess",
        "executeMacro",
        "wipeMemory",
        "requestFullSystemPermissions",
        "setSystemAlertLevel",
        "broadcastGlobalDirective",
      ]
    : []),
];

const buildPersonaToolList = (...groups: string[][]): string[] => {
  return Array.from(new Set(groups.flat()));
};

export const PERSONA_TOOL_ACCESS: Record<PersonaType, string[]> = {
  DEFAULT: buildPersonaToolList(
    SHARED_BASE_TOOLS,
    ASSISTANT_TOOLS,
    ["searchAndInstallTools"],
  ),
  DICTATION: buildPersonaToolList(["switchPersona"]),
  ASSISTANT: buildPersonaToolList(SHARED_BASE_TOOLS, ASSISTANT_TOOLS),
  ENGINEER: buildPersonaToolList(
    SHARED_BASE_TOOLS,
    ENGINEER_TOOLS,
    ["searchAndInstallTools"],
  ),
  HACKER: buildPersonaToolList(SHARED_BASE_TOOLS, HACKER_TOOLS),
  LUCAGENT: buildPersonaToolList(
    SHARED_BASE_TOOLS,
    ASSISTANT_TOOLS,
    AUTONOMY_TOOLS,
    LOCAL_DEVICE_TOOLS,
    FINANCE_TOOLS,
    PERSONA_SPECIALIZED_TOOLS.LUCAGENT,
  ),
  LOCALCORE: buildPersonaToolList(
    SHARED_BASE_TOOLS,
    AUTONOMY_TOOLS,
    LOCAL_DEVICE_TOOLS,
    PERSONA_SPECIALIZED_TOOLS.LOCALCORE,
    BUILD_CAPABILITIES.PRIVILEGED_DESTRUCTIVE_TOOLS
      ? ["initiateLockdown"]
      : [],
  ),
  AUDITOR: buildPersonaToolList(
    SHARED_BASE_TOOLS,
    ["auditSourceCode", "readFile", "listFiles", "readDocument"],
    PERSONA_SPECIALIZED_TOOLS.AUDITOR,
  ),
  RUTHLESS: buildPersonaToolList(
    SHARED_BASE_TOOLS,
    ENGINEER_TOOLS,
    HACKER_TOOLS,
    AUTONOMY_TOOLS,
    LOCAL_DEVICE_TOOLS,
    FINANCE_TOOLS,
    DESTRUCTIVE_TOOLS,
    PERSONA_SPECIALIZED_TOOLS.RUTHLESS,
  ),
};

/**
 * Check if a persona has access to a specific tool.
 */
export function hasToolAccess(persona: PersonaType, toolName: string): boolean {
  const allowedTools = PERSONA_TOOL_ACCESS[persona] || [];
  return allowedTools.includes(toolName);
}

/**
 * Get all tool names a persona may reason about before runtime registration is
 * intersected in the bridge.
 */
export function getPersonaTools(persona: PersonaType): string[] {
  return PERSONA_TOOL_ACCESS[persona] || [];
}

/**
 * Recommend a persona for a requested tool category.
 */
export function getPersonaForToolCategory(category: string): PersonaType {
  const lowerCategory = category.toLowerCase();

  if (
    lowerCategory.includes("code") ||
    lowerCategory.includes("file") ||
    lowerCategory.includes("repo")
  ) {
    return "ENGINEER";
  }
  if (
    lowerCategory.includes("security") ||
    lowerCategory.includes("osint") ||
    lowerCategory.includes("network")
  ) {
    return "HACKER";
  }
  if (
    lowerCategory.includes("document") ||
    lowerCategory.includes("communication") ||
    lowerCategory.includes("calendar")
  ) {
    return "ASSISTANT";
  }
  if (
    lowerCategory.includes("goal") ||
    lowerCategory.includes("autonomy") ||
    lowerCategory.includes("skill")
  ) {
    return "LUCAGENT";
  }

  return "RUTHLESS";
}
