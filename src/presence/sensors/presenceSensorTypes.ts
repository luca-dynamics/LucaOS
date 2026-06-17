import type { PresenceCapabilityStatus, PresenceSensorKind, PresenceSurface } from "../presenceTypes";

export type { PresenceSensorKind } from "../presenceTypes";

export type PresenceSensorStatus = PresenceCapabilityStatus | "enabled" | "disabled" | "inactive" | "unknown" | (string & {});
export type PresenceSensorSource = "voice" | "dashboard" | "visual-core" | "widget" | "hologram" | "miniChat" | "luca-link" | "system" | "legacy" | (string & {});
export type PresenceSensorPermissionState = "unknown" | "prompt" | "granted" | "denied" | "blocked" | "unsupported" | (string & {});

export interface PresenceSensorDisclosure {
  kind: PresenceSensorKind;
  active?: boolean;
  enabled?: boolean;
  status?: PresenceSensorStatus;
  source?: PresenceSensorSource;
  surface?: PresenceSurface | (string & {});
  permission?: PresenceSensorPermissionState;
  reason?: string;
  label?: string;
  displayText?: string;
  timestamp?: number;
  requiresDisclosure?: boolean;
  isDisclosed?: boolean;
  approvalId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PresenceSensorRouteState {
  microphone?: PresenceSensorDisclosure;
  screen?: PresenceSensorDisclosure;
  camera?: PresenceSensorDisclosure;
  vision?: PresenceSensorDisclosure;
  clipboard?: PresenceSensorDisclosure;
  file?: PresenceSensorDisclosure;
  filesystem?: PresenceSensorDisclosure;
  browser?: PresenceSensorDisclosure;
  location?: PresenceSensorDisclosure;
  disclosures?: PresenceSensorDisclosure[];
  timestamp?: number;
  [key: string]: unknown;
}

export interface PresenceSensorRouteEnvelope {
  schemaVersion: 1;
  route: "presence.sensor.disclosure";
  state: PresenceSensorRouteState;
  timestamp?: number;
  source?: PresenceSensorSource;
  surface?: PresenceSurface | (string & {});
  [key: string]: unknown;
}
