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

export type LucaLinkRuntimeRiskLevel = "low" | "medium" | "high" | "critical";

export interface LucaLinkRuntimeFlags {
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

export interface LucaLinkRuntimeAuthorityRecord extends LucaLinkRuntimeFlags {
  authorityId: string;
  createdAt: string;
  source: LucaLinkRuntimeAuthoritySource;
  capabilityKind: LucaLinkRuntimeCapabilityKind;
  authorityClass: LucaLinkRuntimeAuthorityClass;
  riskLevel: LucaLinkRuntimeRiskLevel;
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

export interface LucaLinkRuntimeAuthorityPolicyInput {
  capabilityKind: LucaLinkRuntimeCapabilityKind | string;
  source: LucaLinkRuntimeAuthoritySource | string;
  riskLevel?: LucaLinkRuntimeRiskLevel;
  declarationsComplete?: boolean;
  reviewOnlyDeclaration?: boolean;
  sourceSupported?: boolean;
  dryRunHandoffSimulationExists?: boolean;
  dryRunHandoffSuccessful?: boolean;
  transportDecision?: "allowed_preview" | "approval_required" | "blocked" | "unsupported" | "missing";
  transportEvidenceExists?: boolean;
  approvalPathExists?: boolean;
  fileInstallDecision?: "review_only" | "approval_required" | "blocked" | "unsupported" | "not_required" | "missing";
  liveSensorCollectionRequired?: boolean;
  permanentBlockedCapabilityPresent?: boolean;
  requestedByHostId?: string;
  targetHostId?: string;
  expiryRequirementExists?: boolean;
  redactionRequirementExists?: boolean;
  operationCenterVisibilityExists?: boolean;
  authorityGranted?: boolean;
  handoffEnabled?: boolean;
  transportSendEnabled?: boolean;
  adapterExecutionEnabled?: boolean;
  displayOpenEnabled?: boolean;
  sensorCollectionEnabled?: boolean;
  fileWriteEnabled?: boolean;
  installEnabled?: boolean;
  sideEffectsPerformed?: boolean;
}

export interface LucaLinkRuntimeAuthorityPolicyResult extends LucaLinkRuntimeFlags {
  authorityClass: LucaLinkRuntimeAuthorityClass;
  riskLevel: LucaLinkRuntimeRiskLevel;
  requiredEvidence: string[];
  requiredApprovals: string[];
  requiredHostBoundary: string[];
  blockedActions: string[];
  warnings: string[];
  blockers: string[];
}

export interface LucaLinkRuntimeRegistryDeclaration extends LucaLinkRuntimeAuthorityPolicyInput {
  id: string;
  createdAt?: string;
  requestedByHostId?: string;
  targetHostId?: string;
  targetDeviceId?: string;
  relatedSimulationId?: string;
  relatedRequestId?: string;
}

export interface LucaLinkRuntimeCapabilityRegistryInput {
  adapterSandboxPlans?: readonly LucaLinkRuntimeRegistryDeclaration[];
  webDisplayIntents?: readonly LucaLinkRuntimeRegistryDeclaration[];
  approvalNotifications?: readonly LucaLinkRuntimeRegistryDeclaration[];
  sensorSnapshots?: readonly LucaLinkRuntimeRegistryDeclaration[];
  transportPermissionDecisions?: readonly LucaLinkRuntimeRegistryDeclaration[];
  adapterFileInstallDecisions?: readonly LucaLinkRuntimeRegistryDeclaration[];
  dryRunHandoffSimulations?: readonly LucaLinkRuntimeRegistryDeclaration[];
  fixtures?: readonly LucaLinkRuntimeRegistryDeclaration[];
}

export interface LucaLinkRuntimeAuthorityEvidence extends LucaLinkRuntimeFlags {
  authorityId: string;
  sourceModel: string;
  hostScope: string[];
  transportPermission: string;
  approvalPath: string[];
  dryRunHandoffEvidence: string[];
  redactionAndExpiryRequirements: string[];
  blockedActions: string[];
  fileInstallStatus: string;
  sensorRestrictions: string[];
  displayRestrictions: string[];
  futurePilotRequirements: string[];
  warnings: string[];
}

export interface LucaLinkRuntimeAuthorityReadiness extends LucaLinkRuntimeFlags {
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
