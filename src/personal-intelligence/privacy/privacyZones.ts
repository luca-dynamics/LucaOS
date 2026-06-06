export const PRIVACY_ZONES = [
  "public", "project", "private", "device", "credential", "financial", "health", "enterprise",
] as const;

export type PrivacyZone = (typeof PRIVACY_ZONES)[number];
export type PrivacyOperation = "read" | "write";

export function isPrivacyZone(value: string): value is PrivacyZone {
  return (PRIVACY_ZONES as readonly string[]).includes(value);
}
