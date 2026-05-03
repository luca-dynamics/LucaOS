/**
 * LUCA Build Configuration
 * Distinguishes between 'ORIGIN' (Creator/Dev version) and 'PUBLIC' (General release).
 */

import {
  createBoundaryProfile,
  type BuildType,
} from "./layerBoundary";

// We use an environment variable to set the build type.
// Default to PUBLIC for safety if not specified.
export const LUCA_BUILD_TYPE: BuildType =
  (import.meta.env.VITE_LUCA_BUILD_TYPE as BuildType) || "PUBLIC";

export const LUCA_BOUNDARY_PROFILE = createBoundaryProfile(LUCA_BUILD_TYPE);
export const LUCA_RESOLVED_BUILD_TYPE = LUCA_BOUNDARY_PROFILE.buildType;
export const LUCA_SURFACE_LAYER = LUCA_BOUNDARY_PROFILE.surfaceLayer;
export const LUCA_AUDIENCE_TIER = LUCA_BOUNDARY_PROFILE.audienceTier;

export const IS_ORIGIN = LUCA_AUDIENCE_TIER === "origin";
export const IS_PUBLIC = LUCA_SURFACE_LAYER === "public";
export const IS_PUBLIC_TACTICAL = LUCA_AUDIENCE_TIER === "public_tactical";
export const IS_PUBLIC_STANDARD = LUCA_AUDIENCE_TIER === "public_standard";

/**
 * Access Control based on Build Type
 */
export const BUILD_CAPABILITIES = {
  // Can the agent modify its own source code?
  SELF_REPLICATION: LUCA_BOUNDARY_PROFILE.capabilities.selfReplication,
  
  // Can the agent perform destructive OS operations?
  ROOT_ACCESS: LUCA_BOUNDARY_PROFILE.capabilities.rootAccess,
  
  // Is the BDI Kernel in strict (Public) or fluid (Origin) mode?
  STRICT_GOVERNANCE: LUCA_BOUNDARY_PROFILE.capabilities.strictGovernance,
  
  // Enable developmental/experimental personas?
  EXPERIMENTAL_PERSONAS: LUCA_BOUNDARY_PROFILE.capabilities.experimentalPersonas,
  
  // Allow dynamic tool creation (Self-Generation)?
  DYNAMIC_TOOL_CREATION: LUCA_BOUNDARY_PROFILE.capabilities.dynamicToolCreation,

  // Surface access to privileged trading features?
  PRIVILEGED_TRADING: LUCA_BOUNDARY_PROFILE.capabilities.privilegedTrading,

  // Surface access to destructive / offensive tools?
  PRIVILEGED_DESTRUCTIVE_TOOLS:
    LUCA_BOUNDARY_PROFILE.capabilities.privilegedDestructiveTools,

  // Allow exporting deep internal tactical diagnostics?
  SUPPORT_SNAPSHOT_EXPORT:
    LUCA_BOUNDARY_PROFILE.capabilities.supportSnapshotExport,

  // Allow autonomous repair actions?
  AUTONOMOUS_REPAIR: LUCA_BOUNDARY_PROFILE.capabilities.autonomousRepair,
};

console.log(
  `[LUCA_BUILD] Initialized as: ${LUCA_RESOLVED_BUILD_TYPE} (${LUCA_AUDIENCE_TIER})`,
);
