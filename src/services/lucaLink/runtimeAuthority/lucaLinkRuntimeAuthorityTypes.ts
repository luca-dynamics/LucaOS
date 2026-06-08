export type LucaLinkRuntimeAuthorityClass =
  | "permanently_blocked"
  | "review_only"
  | "dry_run_only"
  | "future_bounded_handoff_candidate"
  | "unsupported";

export type LucaLinkRuntimeCapabilityKind =
  | "handoff"
  | "transport_send"
  | "adapter_execution"
  | "display_open"
  | "display_cast"
  | "sensor_collection"
  | "sensor_snapshot_review"
  | "approval_notification_review"
  | "approval_decision_send"
  | "file_write"
  | "package_install"
  | "host_config_mutation"
  | "pairing_mutation"
  | "relay_mutation"
  | "webrtc_connection"
  | "vpn_connection"
  | "guest_session_mutation"
  | "device_control"
  | "browser_automation"
  | "shell_command"
  | "credential_access"
  | "raw_host_data_access"
  | "background_surveillance"
  | "unknown";

export type LucaLinkRuntimeAuthoritySource =
  | "adapter_plan"
  | "display_intent"
  | "approval_notification"
  | "sensor_snapshot"
  | "transport_decision"
  | "file_install_decision"
  | "dry_run_handoff"
  | "fixture";

export type LucaLinkRuntimeAuthorityRiskLevel = "low" | "medium" | "high" | "critical";

export interface LucaLinkRuntimeDisabledFlags {
  authorityGranted: false;
  handoffEnabled: false;
  transportSendEnabled: false;
  adapterExecutionEnabled: false;
  displayOpenEnabled: false;
  sensorCollectionEnabled: false;
  fileWriteEnabled: false;
  installEnabled: false;
  sideEffectsPerformed: false;
}

export const LUCA_LINK_RUNTIME_DISABLED_FLAGS: LucaLinkRuntimeDisabledFlags = Object.freeze({
  authorityGranted: false,
  handoffEnabled: false,
  transportSendEnabled: false,
  adapterExecutionEnabled: false,
  displayOpenEnabled: false,
  sensorCollectionEnabled: false,
  fileWriteEnabled: false,
  installEnabled: false,
  sideEffectsPerformed: false,
});

export interface LucaLinkRuntimeAuthorityRecord extends LucaLinkRuntimeDisabledFlags {
  authorityId: string;
  createdAt: string;
  source: LucaLinkRuntimeAuthoritySource;
  capabilityKind: LucaLinkRuntimeCapabilityKind;
  authorityClass: LucaLinkRuntimeAuthorityClass;
  riskLevel: LucaLinkRuntimeAuthorityRiskLevel;
  requestedByHostId?: string;
  targetHostId?: string;
  targetDeviceId?: string;
  relatedSimulationId?: string;
  relatedRequestId?: string;
  requiredEvidence: string[];
  requiredApprovals: string[];
  requiredHostBoundary: string[];
  blockedActions: string[];
  warnings: string[];
  blockers: string[];
}

export interface LucaLinkRuntimeAuthorityReadiness extends LucaLinkRuntimeDisabledFlags {
  totalRecords: number;
  permanentlyBlocked: number;
  reviewOnly: number;
  dryRunOnly: number;
  futureBoundedHandoffCandidates: number;
  unsupported: number;
  highRiskCount: number;
  criticalRiskCount: number;
  warnings: string[];
  blockers: string[];
}

export interface LucaLinkRuntimeAuthorityCandidateEvidence {
  dryRunHandoffSimulationExists?: boolean;
  dryRunHandoffSucceeded?: boolean;
  transportDecision?: "allowed_preview" | "approval_required" | "blocked" | "unsupported" | "missing";
  transportEvidencePresent?: boolean;
  approvalPathExists?: boolean;
  fileInstallDecision?: "clear" | "approval_required" | "blocked" | "unsupported" | "missing";
  liveSensorCollectionRequired?: boolean;
  permanentBlockedCapabilityPresent?: boolean;
  expiryRequirementExists?: boolean;
  redactionRequirementExists?: boolean;
  operationCenterVisibilityExists?: boolean;
}

export interface LucaLinkRuntimeAuthorityClassificationInput {
  authorityId?: string;
  createdAt?: string | number | Date;
  source: LucaLinkRuntimeAuthoritySource;
  capabilityKind: LucaLinkRuntimeCapabilityKind | string;
  riskLevel?: LucaLinkRuntimeAuthorityRiskLevel;
  requestedByHostId?: string;
  targetHostId?: string;
  targetDeviceId?: string;
  relatedSimulationId?: string;
  relatedRequestId?: string;
  requiredEvidence?: readonly string[];
  requiredApprovals?: readonly string[];
  requiredHostBoundary?: readonly string[];
  blockedActions?: readonly string[];
  warnings?: readonly string[];
  blockers?: readonly string[];
  candidateRequested?: boolean;
  candidateEvidence?: LucaLinkRuntimeAuthorityCandidateEvidence;
  authorityGranted?: boolean;
  handoffEnabled?: boolean;
  transportSendEnabled?: boolean;
  adapterExecutionEnabled?: boolean;
  displayOpenEnabled?: boolean;
  sensorCollectionEnabled?: boolean;
  fileWriteEnabled?: boolean;
  installEnabled?: boolean;
  sideEffectsPerformed?: boolean;
  declarationComplete?: boolean;
  sourceSupported?: boolean;
}

export interface LucaLinkRuntimeAuthorityEvidence extends LucaLinkRuntimeDisabledFlags {
  authorityId: string;
  sourceModel: string;
  hostScope: string;
  transportPermission: string;
  approvalPath: string;
  dryRunHandoffEvidence: string;
  redactionAndExpiryRequirements: string[];
  blockedActions: string[];
  fileInstallStatus: string;
  sensorRestrictions: string[];
  displayRestrictions: string[];
  futurePilotRequirements: string[];
  warnings: string[];
  blockers: string[];
}

export interface LucaLinkRuntimeAuthorityEvidenceContext {
  transportPermission?: string;
  approvalPath?: string;
  dryRunHandoffEvidence?: string;
  redactionRequirements?: readonly string[];
  expiryRequirements?: readonly string[];
  fileInstallStatus?: string;
  sensorRestrictions?: readonly string[];
  displayRestrictions?: readonly string[];
  futurePilotRequirements?: readonly string[];
}

export interface LucaLinkRuntimeRegistrySourceEntry {
  id?: string;
  planId?: string;
  snapshotId?: string;
  decisionId?: string;
  createdAt?: string | number | Date;
  capabilityKind?: LucaLinkRuntimeCapabilityKind | string;
  riskLevel?: LucaLinkRuntimeAuthorityRiskLevel;
  requestedByHostId?: string;
  targetHostId?: string;
  targetDeviceId?: string;
  hostId?: string;
  requestId?: string;
  simulationId?: string;
  operation?: "file_write" | "install" | "package_install" | string;
  status?: string;
  requiredEvidence?: readonly unknown[];
  requiredApprovals?: readonly unknown[];
  requiredHostBoundary?: readonly string[];
  blockedActions?: readonly string[];
  warnings?: readonly string[];
  blockers?: readonly string[];
  candidateRequested?: boolean;
  candidateEvidence?: LucaLinkRuntimeAuthorityCandidateEvidence;
  declarationComplete?: boolean;
  sourceSupported?: boolean;
}

export interface LucaLinkRuntimeCapabilityRegistryInput {
  adapterSandboxPlans?: readonly LucaLinkRuntimeRegistrySourceEntry[];
  webDisplayIntents?: readonly LucaLinkRuntimeRegistrySourceEntry[];
  approvalNotifications?: readonly LucaLinkRuntimeRegistrySourceEntry[];
  sensorSnapshots?: readonly LucaLinkRuntimeRegistrySourceEntry[];
  transportPermissionDecisions?: readonly LucaLinkRuntimeRegistrySourceEntry[];
  adapterFileInstallDecisions?: readonly LucaLinkRuntimeRegistrySourceEntry[];
  dryRunHandoffSimulations?: readonly LucaLinkRuntimeRegistrySourceEntry[];
}
