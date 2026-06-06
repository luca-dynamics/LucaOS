import type { PrivacyZone } from "../privacy/privacyZones";

export type CommunicationStyle = "concise" | "balanced" | "detailed" | "technical" | "conversational";

export interface LucaPersonalityProfile {
  tone: string;
  traits: string[];
  boundaries: string[];
}

export interface DevicePreference {
  deviceId: string;
  label?: string;
  preferences: Record<string, string | number | boolean>;
}

export interface IdentityCore {
  userId: string;
  displayName: string;
  preferredName: string;
  communicationStyle: CommunicationStyle;
  lucaPersonality: LucaPersonalityProfile;
  activeProjects: string[];
  preferredModels: string[];
  devicePreferences: DevicePreference[];
  privacyDefaults: Partial<Record<PrivacyZone, "allow" | "deny">>;
  createdAt: string;
  updatedAt: string;
}

export type IdentityCoreInput = Omit<IdentityCore, "createdAt" | "updatedAt"> &
  Partial<Pick<IdentityCore, "createdAt" | "updatedAt">>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
