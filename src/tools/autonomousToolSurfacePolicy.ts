import { LUCA_AUDIENCE_TIER } from "../config/buildConfig";
import {
  canAccessAudienceTier,
  type LucaAudienceTier,
} from "../config/layerBoundary";

export type AutonomousToolSurfaceId =
  | "manageGoals"
  | "autonomousWebBrowse"
  | "openAutonomyDashboard"
  | "generateAndRegisterSkill"
  | "executeRpcScript"
  | "createCustomSkill"
  | "executeCustomSkill"
  | "listCustomSkills";

export interface AutonomousToolSurfacePolicyEntry {
  id: AutonomousToolSurfaceId;
  minimumAudienceTier: LucaAudienceTier;
  rationale: string;
}

export const AUTONOMOUS_TOOL_SURFACE_POLICIES: Record<
  AutonomousToolSurfaceId,
  AutonomousToolSurfacePolicyEntry
> = {
  manageGoals: {
    id: "manageGoals",
    minimumAudienceTier: "public_standard",
    rationale:
      "Goal management is a core user-facing autonomy capability.",
  },
  autonomousWebBrowse: {
    id: "autonomousWebBrowse",
    minimumAudienceTier: "public_tactical",
    rationale:
      "Autonomous browsing may belong on public surfaces with tighter safety and presentation constraints.",
  },
  openAutonomyDashboard: {
    id: "openAutonomyDashboard",
    minimumAudienceTier: "public_tactical",
    rationale:
      "Autonomy dashboards likely need a public-safe summary rather than the raw origin experience.",
  },
  generateAndRegisterSkill: {
    id: "generateAndRegisterSkill",
    minimumAudienceTier: "public_tactical",
    rationale:
      "Tactical users should be able to generate and register new skills in the same class of agentic workflow supported by advanced coding copilots.",
  },
  executeRpcScript: {
    id: "executeRpcScript",
    minimumAudienceTier: "public_tactical",
    rationale:
      "Structured automation scripts are part of the expected tactical-user toolkit for advanced agentic execution workflows.",
  },
  createCustomSkill: {
    id: "createCustomSkill",
    minimumAudienceTier: "public_tactical",
    rationale:
      "Direct custom-skill creation belongs on the tactical surface even if it remains too raw for standard public users.",
  },
  executeCustomSkill: {
    id: "executeCustomSkill",
    minimumAudienceTier: "public_tactical",
    rationale:
      "Skill execution may eventually be public-safe for approved skills, but the current implementation needs curation.",
  },
  listCustomSkills: {
    id: "listCustomSkills",
    minimumAudienceTier: "public_tactical",
    rationale:
      "A curated public skill catalog may be appropriate, but the current registry is still too raw.",
  },
};

export const canRegisterAutonomousTool = (
  toolId: AutonomousToolSurfaceId,
  options?: { enforceBoundary?: boolean },
): boolean => {
  if (!options?.enforceBoundary) return true;
  return canAccessAudienceTier(
    LUCA_AUDIENCE_TIER,
    AUTONOMOUS_TOOL_SURFACE_POLICIES[toolId].minimumAudienceTier,
  );
};
