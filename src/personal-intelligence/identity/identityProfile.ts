import type { IdentityCore, IdentityCoreInput, ValidationResult } from "./identityTypes";

const COMMUNICATION_STYLES = new Set(["concise", "balanced", "detailed", "technical", "conversational"]);

export function validateIdentityProfile(profile: IdentityCore): ValidationResult {
  const errors: string[] = [];
  if (!profile.userId.trim()) errors.push("userId is required");
  if (!profile.displayName.trim()) errors.push("displayName is required");
  if (!profile.preferredName.trim()) errors.push("preferredName is required");
  if (!COMMUNICATION_STYLES.has(profile.communicationStyle)) errors.push("communicationStyle is invalid");
  if (!profile.lucaPersonality.tone.trim()) errors.push("lucaPersonality.tone is required");
  if (!isIsoDate(profile.createdAt)) errors.push("createdAt must be an ISO date");
  if (!isIsoDate(profile.updatedAt)) errors.push("updatedAt must be an ISO date");
  return { valid: errors.length === 0, errors };
}

export function createIdentityProfile(input: IdentityCoreInput, now: () => Date = () => new Date()): IdentityCore {
  const timestamp = now().toISOString();
  const profile: IdentityCore = {
    ...input,
    activeProjects: [...input.activeProjects],
    preferredModels: [...input.preferredModels],
    devicePreferences: input.devicePreferences.map((device) => ({ ...device, preferences: { ...device.preferences } })),
    privacyDefaults: { ...input.privacyDefaults },
    lucaPersonality: {
      ...input.lucaPersonality,
      traits: [...input.lucaPersonality.traits],
      boundaries: [...input.lucaPersonality.boundaries],
    },
    createdAt: input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp,
  };
  const validation = validateIdentityProfile(profile);
  if (!validation.valid) throw new Error(`Invalid identity profile: ${validation.errors.join(", ")}`);
  return profile;
}

function isIsoDate(value: string): boolean {
  return Boolean(value) && !Number.isNaN(Date.parse(value));
}
