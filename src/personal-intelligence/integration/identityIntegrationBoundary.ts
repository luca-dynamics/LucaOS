import { createIdentityProfile, validateIdentityProfile } from "../identity/identityProfile";
import type { IdentityCore, IdentityCoreInput, ValidationResult } from "../identity/identityTypes";
import type { IntegrationMappingDescription } from "./integrationTypes";

export function createIdentityProfilePreview(input: IdentityCoreInput, now?: () => Date): IdentityCore {
  return createIdentityProfile(input, now);
}

export function validateIdentityProfilePreview(input: IdentityCore): ValidationResult {
  return validateIdentityProfile(input);
}

export function describeOnboardingIdentityMapping(): IntegrationMappingDescription {
  return {
    source: "onboarding preview state",
    destination: "Identity Core preview",
    previewFields: ["displayName", "preferredName", "communicationStyle", "lucaPersonality"],
    forbiddenEffects: ["persistence", "runtime profile mutation", "provider/model router mutation", "device preference application"],
    notes: ["Onboarding may render and validate a proposed profile without applying it."],
  };
}

export function describeSettingsIdentityMapping(): IntegrationMappingDescription {
  return {
    source: "settings preview state",
    destination: "Identity Core preview",
    previewFields: ["communicationStyle", "preferredModels", "devicePreferences", "privacyDefaults"],
    forbiddenEffects: ["persistence", "model selection", "device mutation", "runtime service mutation"],
    notes: ["All preferences remain descriptive until separately governed adapters exist."],
  };
}
