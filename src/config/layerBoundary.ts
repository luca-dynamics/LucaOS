/**
 * LUCA Layer Boundary Model
 *
 * This is the first concrete P2 primitive: a shared vocabulary for which
 * surface we are shipping and which privileged capabilities that surface may expose.
 */

export type BuildType =
  | "ORIGIN"
  | "PUBLIC"
  | "PUBLIC_TACTICAL"
  | "PUBLIC_STANDARD";

export type LucaSurfaceLayer = "origin" | "public";

export type LucaAudienceTier =
  | "origin"
  | "public_tactical"
  | "public_standard";

export interface LucaBoundaryCapabilities {
  selfReplication: boolean;
  rootAccess: boolean;
  strictGovernance: boolean;
  experimentalPersonas: boolean;
  dynamicToolCreation: boolean;
  privilegedTrading: boolean;
  privilegedDestructiveTools: boolean;
  supportSnapshotExport: boolean;
  autonomousRepair: boolean;
}

export interface LucaBoundaryProfile {
  buildType: BuildType;
  surfaceLayer: LucaSurfaceLayer;
  audienceTier: LucaAudienceTier;
  capabilities: LucaBoundaryCapabilities;
  labels: {
    engineer: string;
    lucagent: string;
    auditor: string;
  };
}

const AUDIENCE_TIER_RANK: Record<LucaAudienceTier, number> = {
  public_standard: 0,
  public_tactical: 1,
  origin: 2,
};

export const normalizeBuildType = (buildType: BuildType): Exclude<
  BuildType,
  "PUBLIC"
> => {
  if (buildType === "PUBLIC") return "PUBLIC_STANDARD";
  return buildType;
};

export const createBoundaryProfile = (
  buildType: BuildType,
): LucaBoundaryProfile => {
  const normalizedBuildType = normalizeBuildType(buildType);
  const isOrigin = normalizedBuildType === "ORIGIN";
  const isPublicTactical = normalizedBuildType === "PUBLIC_TACTICAL";

  return {
    buildType: normalizedBuildType,
    surfaceLayer: isOrigin ? "origin" : "public",
    audienceTier: isOrigin
      ? "origin"
      : isPublicTactical
        ? "public_tactical"
        : "public_standard",
    capabilities: {
      selfReplication: isOrigin,
      rootAccess: isOrigin,
      strictGovernance: !isOrigin,
      experimentalPersonas: isOrigin,
      dynamicToolCreation: true,
      privilegedTrading: isOrigin || isPublicTactical,
      privilegedDestructiveTools: isOrigin,
      supportSnapshotExport: isOrigin || isPublicTactical,
      autonomousRepair: isOrigin,
    },
    labels: {
      engineer: isOrigin
        ? "ORIGIN (RECURSIVE ARCHITECT)"
        : isPublicTactical
          ? "PUBLIC (TACTICAL BUILD)"
          : "PUBLIC (STANDARD BUILD)",
      lucagent: isOrigin
        ? "ORIGIN (PROGENITOR)"
        : isPublicTactical
          ? "PUBLIC (TACTICAL RELEASE)"
          : "PUBLIC (STANDARD RELEASE)",
      auditor: isOrigin
        ? "ORIGIN (CREATOR CLEARANCE)"
        : isPublicTactical
          ? "PUBLIC (TACTICAL SECURITY)"
          : "PUBLIC (STANDARD SECURITY)",
    },
  };
};

export const canAccessBoundaryCapability = (
  profile: LucaBoundaryProfile,
  capability: keyof LucaBoundaryCapabilities,
): boolean => {
  return profile.capabilities[capability];
};

export const canAccessAudienceTier = (
  currentTier: LucaAudienceTier,
  minimumTier: LucaAudienceTier,
): boolean => {
  return AUDIENCE_TIER_RANK[currentTier] >= AUDIENCE_TIER_RANK[minimumTier];
};
