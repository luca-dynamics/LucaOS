import { createMissionProfile, validateMissionProfile } from "../mission/missionProfile";
import type { MissionOperatingMode, MissionProfile, MissionProfileInput, MissionValidationResult } from "../mission/missionTypes";
import type { IntegrationMappingDescription } from "./integrationTypes";

export interface MissionModeDescription {
  mode: MissionOperatingMode;
  planningOnly: boolean;
  futureOnly: boolean;
  description: string;
}

export function createMissionProfilePreview(input: MissionProfileInput, now?: () => Date): MissionProfile {
  return createMissionProfile(input, now);
}

export function validateMissionProfilePreview(input: MissionProfile): MissionValidationResult {
  return validateMissionProfile(input);
}

export function describeMissionRuntimeMapping(): IntegrationMappingDescription {
  return {
    source: "Mission Profile preview",
    destination: "future mission runtime adapter",
    previewFields: ["goals", "constraints", "successCriteria", "activeProjectRefs", "operatingMode", "priority", "status"],
    forbiddenEffects: ["tool execution", "runtime mission mutation", "automatic activation", "approval bypass"],
    notes: ["This boundary supplies planning context only."],
  };
}

export function describeMissionModes(): MissionModeDescription[] {
  return [
    { mode: "advisory", planningOnly: true, futureOnly: false, description: "Produces advice and inspectable plans without acting." },
    { mode: "collaborative", planningOnly: true, futureOnly: false, description: "Supports shared planning without tool execution." },
    { mode: "supervised_execution", planningOnly: true, futureOnly: true, description: "Reserved for a separately governed runtime PR." },
  ];
}
