/**
 * LUCA Build Configuration
 * Distinguishes between 'ORIGIN' (Creator/Dev version) and 'PUBLIC' (General release).
 */

export type BuildType = "ORIGIN" | "PUBLIC";

// We use an environment variable to set the build type.
// Default to PUBLIC for safety if not specified.
export const LUCA_BUILD_TYPE: BuildType = (import.meta.env.VITE_LUCA_BUILD_TYPE as BuildType) || "PUBLIC";

export const IS_ORIGIN = LUCA_BUILD_TYPE === "ORIGIN";
export const IS_PUBLIC = LUCA_BUILD_TYPE === "PUBLIC";

/**
 * Access Control based on Build Type
 */
export const BUILD_CAPABILITIES = {
  // Can the agent modify its own source code?
  SELF_REPLICATION: IS_ORIGIN,
  
  // Can the agent perform destructive OS operations?
  ROOT_ACCESS: IS_ORIGIN,
  
  // Is the BDI Kernel in strict (Public) or fluid (Origin) mode?
  STRICT_GOVERNANCE: IS_PUBLIC,
  
  // Enable developmental/experimental personas?
  EXPERIMENTAL_PERSONAS: IS_ORIGIN,
  
  // Allow dynamic tool creation (Self-Generation)?
  DYNAMIC_TOOL_CREATION: IS_ORIGIN,
};

console.log(`[LUCA_BUILD] Initialized as: ${LUCA_BUILD_TYPE}`);
