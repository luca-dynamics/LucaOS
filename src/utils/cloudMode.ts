/**
 * Cloud-Only Mode Detection Utility
 *
 * When Luca OS boots without local infrastructure (no Python backend, no Electron),
 * the BIOS sets a sessionStorage flag to indicate Cloud-Only mode.
 *
 * Features that work in Cloud-Only mode:
 * - Chat (Gemini API calls directly from browser)
 * - Voice Conversation (Gemini Live API)
 * - Onboarding Flow
 * - Settings & Profile (localStorage)
 * - Theme & Persona switching
 *
 * Features that require the Desktop app (disabled in Cloud-Only):
 * - Terminal / Shell commands
 * - File system access
 * - OSINT / Hacking tools
 * - IoT / Smart Home control
 * - Long-term vector memory (Cortex)
 * - Screen sharing / Desktop streaming
 * - MCP Server connections
 */

/**
 * Check if the app is running in Cloud-Only mode (no local backend)
 */
export const isCloudOnly = (): boolean => {
  return sessionStorage.getItem("LUCA_CLOUD_ONLY") === "true";
};

/**
 * Check if the local backend infrastructure is available
 */
export const hasLocalInfrastructure = (): boolean => {
  return !isCloudOnly();
};

/**
 * Clear Cloud-Only mode (called when local infrastructure is detected later)
 * This allows dynamic recovery if the user starts the Desktop app after loading the web version
 */
export const clearCloudOnlyMode = (): void => {
  sessionStorage.removeItem("LUCA_CLOUD_ONLY");
  console.log(
    "[CLOUD] Cloud-Only mode cleared. Local infrastructure detected.",
  );
};
