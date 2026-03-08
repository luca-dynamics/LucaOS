/**
 * Core tools that are ALWAYS available in Voice Mode (Gemini Live),
 * regardless of the active persona.
 *
 * These represent "Basic Survival Skills" like memory memory, system control,
 * and web browsing that every persona needs to function effectively.
 */
export const CORE_VOICE_TOOLS = [
  // System Control
  "controlSystem",
  "runNativeAutomation",
  "controlSystemInput",
  "aiClick", // Agentic Click (Find & Click visually)
  "typeText", // Direct typing
  "pressKey", // Key presses (Enter, Esc, etc)
  "captureScreen",
  "closeApp",
  "getActiveApp",
  "openAppOnDesktop",
  // Web & Search
  "searchWeb",
  "searchMaps",
  // Memory
  "retrieveMemory",
  "storeMemory",
  // Clipboard
  "readClipboard",
  "writeClipboard",
  // Vision
  "readScreen",
  "analyzeImageDeeply",
  // Task & Creativity
  "createTask",
  "generateOrEditImage",
  // Communication
  "sendInstantMessage",
  "createCustomSkill",
  "restartConversation",
  // META-TOOLS: On-Demand Access to ALL 220+ Tools
  "listAvailableTools",
  "invokeAnyTool",
];
