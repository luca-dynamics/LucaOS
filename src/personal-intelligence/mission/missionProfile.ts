import type { MissionProfile, MissionProfileInput, MissionValidationResult } from "./missionTypes";

const MODES = new Set(["advisory", "collaborative", "supervised_execution"]);
const PRIORITIES = new Set(["low", "normal", "high", "critical"]);
const STATUSES = new Set(["draft", "active", "paused", "completed", "cancelled"]);

export function validateMissionProfile(profile: MissionProfile): MissionValidationResult {
  const errors: string[] = [];
  if (!profile.missionId.trim()) errors.push("missionId is required");
  if (!profile.title.trim()) errors.push("title is required");
  if (!profile.description.trim()) errors.push("description is required");
  if (profile.goals.length === 0) errors.push("at least one goal is required");
  if (profile.successCriteria.length === 0) errors.push("at least one success criterion is required");
  if (!MODES.has(profile.operatingMode)) errors.push("operatingMode is invalid");
  if (!PRIORITIES.has(profile.priority)) errors.push("priority is invalid");
  if (!STATUSES.has(profile.status)) errors.push("status is invalid");
  if (Number.isNaN(Date.parse(profile.createdAt))) errors.push("createdAt must be an ISO date");
  if (Number.isNaN(Date.parse(profile.updatedAt))) errors.push("updatedAt must be an ISO date");
  return { valid: errors.length === 0, errors };
}

export function createMissionProfile(input: MissionProfileInput, now: () => Date = () => new Date()): MissionProfile {
  const timestamp = now().toISOString();
  const profile: MissionProfile = {
    ...input,
    goals: [...input.goals],
    constraints: [...input.constraints],
    successCriteria: [...input.successCriteria],
    activeProjectRefs: [...input.activeProjectRefs],
    createdAt: input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp,
  };
  const validation = validateMissionProfile(profile);
  if (!validation.valid) throw new Error(`Invalid mission profile: ${validation.errors.join(", ")}`);
  return profile;
}
