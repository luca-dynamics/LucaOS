import { LUCA_AUDIENCE_TIER } from "../config/buildConfig";
import {
  canAccessAudienceTier,
  type LucaAudienceTier,
} from "../config/layerBoundary";

export type SystemToolSurfaceId =
  | "executeTerminalCommand"
  | "openInteractiveTerminal"
  | "systemDoctor"
  | "controlSystem"
  | "initiateLockdown"
  | "showActionBlockDisplay";

export interface SystemToolSurfacePolicyEntry {
  id: SystemToolSurfaceId;
  minimumAudienceTier: LucaAudienceTier;
  rationale: string;
}

export const SYSTEM_TOOL_SURFACE_POLICIES: Record<
  SystemToolSurfaceId,
  SystemToolSurfacePolicyEntry
> = {
  executeTerminalCommand: {
    id: "executeTerminalCommand",
    minimumAudienceTier: "public_tactical",
    rationale:
      "Raw shell execution is appropriate for tactical users but should stay off the standard public surface.",
  },
  openInteractiveTerminal: {
    id: "openInteractiveTerminal",
    minimumAudienceTier: "public_tactical",
    rationale:
      "Launching interactive shell windows is appropriate for tactical users but not the standard public surface.",
  },
  systemDoctor: {
    id: "systemDoctor",
    minimumAudienceTier: "public_standard",
    rationale:
      "Diagnostics belong on standard public surfaces in a curated form, with deeper tactical exports restricted separately.",
  },
  controlSystem: {
    id: "controlSystem",
    minimumAudienceTier: "public_standard",
    rationale:
      "Normal device-control actions are part of product operation, though individual actions may need later curation.",
  },
  initiateLockdown: {
    id: "initiateLockdown",
    minimumAudienceTier: "origin",
    rationale:
      "Lockdown is an explicitly privileged defensive control and should remain origin-only.",
  },
  showActionBlockDisplay: {
    id: "showActionBlockDisplay",
    minimumAudienceTier: "public_standard",
    rationale:
      "Display maximization is a normal presentation control and can remain available.",
  },
};

export const canRegisterSystemTool = (
  toolId: SystemToolSurfaceId,
  options?: { enforceBoundary?: boolean },
): boolean => {
  if (!options?.enforceBoundary) return true;
  return canAccessAudienceTier(
    LUCA_AUDIENCE_TIER,
    SYSTEM_TOOL_SURFACE_POLICIES[toolId].minimumAudienceTier,
  );
};
