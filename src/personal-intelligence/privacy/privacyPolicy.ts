import type { PrivacyOperation, PrivacyZone } from "./privacyZones";

export interface PrivacyZoneAccess {
  read: boolean;
  write: boolean;
}

export interface PrivacyPolicy {
  policyId: string;
  zones: Partial<Record<PrivacyZone, Partial<PrivacyZoneAccess>>>;
  defaultAccess?: Partial<PrivacyZoneAccess>;
}

export function canAccessPrivacyZone(policy: PrivacyPolicy, zone: PrivacyZone, operation: PrivacyOperation): boolean {
  return policy.zones[zone]?.[operation] ?? policy.defaultAccess?.[operation] ?? false;
}

export function canReadPrivacyZone(policy: PrivacyPolicy, zone: PrivacyZone): boolean {
  return canAccessPrivacyZone(policy, zone, "read");
}

export function canWritePrivacyZone(policy: PrivacyPolicy, zone: PrivacyZone): boolean {
  return canAccessPrivacyZone(policy, zone, "write");
}
