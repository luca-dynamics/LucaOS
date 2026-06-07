export const LUCA_LINK_ALLOWED_READ_ONLY_SENSOR_KINDS = [
  "battery_status",
  "network_status",
  "device_class",
  "screen_status",
  "os_metadata",
  "browser_metadata",
  "activity_state",
  "capability_status",
  "permission_readiness",
  "host_health",
] as const;

export const LUCA_LINK_BLOCKED_SENSOR_KINDS = [
  "camera_frame",
  "microphone_audio",
  "precise_location",
  "biometric",
  "contacts",
  "files",
  "clipboard",
  "cookies",
  "credentials",
  "raw_storage",
  "background_surveillance",
  "device_control",
] as const;

export type LucaLinkAllowedReadOnlySensorKind =
  (typeof LUCA_LINK_ALLOWED_READ_ONLY_SENSOR_KINDS)[number];
export type LucaLinkBlockedSensorKind =
  (typeof LUCA_LINK_BLOCKED_SENSOR_KINDS)[number];
export type LucaLinkReadOnlySensorKind =
  | LucaLinkAllowedReadOnlySensorKind
  | LucaLinkBlockedSensorKind;

export type LucaLinkSensorMetadataValue =
  | string
  | number
  | boolean
  | null
  | readonly string[]
  | Readonly<Record<string, string | number | boolean | null>>;

export interface LucaLinkReadOnlySensorSnapshot {
  snapshotId: string;
  hostId: string;
  deviceId?: string;
  capturedAt: string;
  expiresAt: string;
  source: "fixture" | "host_report" | "browser_safe_metadata" | "future_bridge";
  status: "draft" | "ready" | "blocked" | "expired";
  privacyLevel: "public" | "project" | "private";
  readOnly: true;
  sensorKinds: string[];
  blockedSensorKinds: string[];
  values: Record<string, LucaLinkSensorMetadataValue>;
  capabilitySummary: string[];
  permissionSummary: string[];
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface LucaLinkSensorBridgePolicyOptions {
  now?: string | Date;
  explicitApprovalMetadata?: {
    approvedByHostId: string;
    approvedAt: string;
  };
  privateSnapshotMode?: "block" | "warn";
}

export interface LucaLinkSensorBridgePolicyEvaluation {
  allowed: boolean;
  status: LucaLinkReadOnlySensorSnapshot["status"];
  allowedSensorKinds: LucaLinkAllowedReadOnlySensorKind[];
  blockedSensorKinds: string[];
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface LucaLinkSensorBridgeReadiness {
  totalSnapshots: number;
  readySnapshots: number;
  blockedSnapshots: number;
  expiredSnapshots: number;
  allowedSensorKinds: LucaLinkAllowedReadOnlySensorKind[];
  blockedSensorKinds: string[];
  sensitiveRequestCount: number;
  readyForReadOnlyBridge: boolean;
  readyForLiveCollection: false;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export type LucaLinkSensorBridgeAuditEventType =
  | "created"
  | "validated"
  | "ready"
  | "blocked"
  | "expired"
  | "preview_created";

export interface LucaLinkSensorBridgeAuditRecord {
  auditId: string;
  snapshotId: string;
  hostId: string;
  timestamp: string;
  eventType: LucaLinkSensorBridgeAuditEventType;
  summary: string;
  allowedSensorKinds: LucaLinkAllowedReadOnlySensorKind[];
  blockedSensorKinds: string[];
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}
