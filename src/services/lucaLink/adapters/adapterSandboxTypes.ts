export const LUCA_LINK_ADAPTER_CAPABILITIES = [
  "display.read",
  "display.present",
  "sensor.read",
  "notification.request",
  "approval.request",
  "message.send",
  "file.read.preview",
  "file.write.request",
  "install.request",
  "network.request",
  "device.status.read",
] as const;

export type LucaLinkAdapterCapability =
  (typeof LUCA_LINK_ADAPTER_CAPABILITIES)[number];

export const LUCA_LINK_ADAPTER_HOST_TYPES = [
  "primary-host",
  "companion-host",
  "display-host",
  "sensor-host",
  "guest-host",
  "execution-host",
  "embodied-host",
] as const;

export type LucaLinkAdapterHostType =
  (typeof LUCA_LINK_ADAPTER_HOST_TYPES)[number];

export const LUCA_LINK_ADAPTER_PERMISSIONS = [
  "host.approval",
  "display.present",
  "sensor.read",
  "notification.request",
  "message.send",
  "file.read.preview",
  "file.write.request",
  "install.request",
  "network.request",
  "device.status.read",
] as const;

export type LucaLinkAdapterPermission =
  (typeof LUCA_LINK_ADAPTER_PERMISSIONS)[number];

export interface LucaLinkAdapterManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  vendor?: string;
  targetHostTypes: LucaLinkAdapterHostType[];
  requestedCapabilities: LucaLinkAdapterCapability[];
  requestedPermissions: LucaLinkAdapterPermission[];
  entrypointRef: string;
  integrity?: string;
  provenance?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LucaLinkAdapterSandboxConfig {
  enabled: boolean;
  dryRun: boolean;
  allowGeneratedCodeExecution: false;
  allowShellExecution: false;
  allowFileWrite: false;
  allowInstall: false;
  allowNetworkMutation: false;
  allowDeviceControl: false;
  allowCredentialAccess: false;
  requireHostApproval: boolean;
  requireManifestIntegrity: boolean;
  allowedCapabilities: readonly LucaLinkAdapterCapability[];
  blockedCapabilities: readonly string[];
  maxPlanSteps: number;
  sourceLabel: string;
}

export type LucaLinkAdapterRiskLevel = "low" | "medium" | "high" | "critical";
export type LucaLinkAdapterPlanStatus =
  | "blocked"
  | "dry_run_ready"
  | "approval_required"
  | "rejected";

export type LucaLinkAdapterPlanStepType =
  | "validate_manifest"
  | "evaluate_capabilities"
  | "request_host_approval"
  | "prepare_dry_run"
  | "blocked_file_write"
  | "blocked_install"
  | "blocked_network"
  | "blocked_device_control"
  | "audit_only";

export interface LucaLinkAdapterExecutionPlanStep {
  id: string;
  type: LucaLinkAdapterPlanStepType;
  summary: string;
  status: "planned" | "blocked" | "audit_only";
  sideEffectsPerformed: false;
}

export interface LucaLinkAdapterPermissionRequest {
  capability: string;
  permission: string;
  targetHostId: string;
  status: "required" | "blocked";
  reason: string;
  executesCapability: false;
}

export interface LucaLinkAdapterRequiredApproval {
  approvalType: "host";
  approverHostId: string;
  reason: string;
  status: "required";
  grantsExecution: false;
}

export interface LucaLinkAdapterExecutionPlan {
  planId: string;
  adapterId: string;
  requestedByHostId: string;
  targetHostId: string;
  requestedCapabilities: string[];
  requiredApprovals: LucaLinkAdapterRequiredApproval[];
  permissionRequests: LucaLinkAdapterPermissionRequest[];
  steps: LucaLinkAdapterExecutionPlanStep[];
  riskLevel: LucaLinkAdapterRiskLevel;
  status: LucaLinkAdapterPlanStatus;
  blockers: string[];
  warnings: string[];
  sideEffectsPerformed: false;
}

export interface LucaLinkAdapterManifestValidation {
  valid: boolean;
  blockers: string[];
  warnings: string[];
}

export interface LucaLinkAdapterCapabilityPolicyEvaluation {
  riskLevel: LucaLinkAdapterRiskLevel;
  blockedCapabilities: string[];
  approvalRequiredCapabilities: string[];
  permissionRequestCapabilities: string[];
  blockers: string[];
  warnings: string[];
  hostApprovalRequired: boolean;
  executableCapabilities: never[];
  sideEffectsAllowed: false;
}

export const REQUEST_ONLY_ADAPTER_CAPABILITIES = [
  "file.write.request",
  "install.request",
  "network.request",
] as const satisfies readonly LucaLinkAdapterCapability[];

export const DEFAULT_BLOCKED_ADAPTER_CAPABILITIES = [
  ...REQUEST_ONLY_ADAPTER_CAPABILITIES,
  "device.control",
  "credential.access",
  "shell.execute",
  "generated-code.execute",
] as const;

export const DEFAULT_LUCA_LINK_ADAPTER_SANDBOX_CONFIG: Readonly<LucaLinkAdapterSandboxConfig> =
  Object.freeze({
    enabled: false,
    dryRun: true,
    allowGeneratedCodeExecution: false,
    allowShellExecution: false,
    allowFileWrite: false,
    allowInstall: false,
    allowNetworkMutation: false,
    allowDeviceControl: false,
    allowCredentialAccess: false,
    requireHostApproval: true,
    requireManifestIntegrity: false,
    allowedCapabilities: Object.freeze([...LUCA_LINK_ADAPTER_CAPABILITIES]),
    blockedCapabilities: Object.freeze([
      ...DEFAULT_BLOCKED_ADAPTER_CAPABILITIES,
    ]),
    maxPlanSteps: 12,
    sourceLabel: "lucalink-controlled-adapter-sandbox",
  });
