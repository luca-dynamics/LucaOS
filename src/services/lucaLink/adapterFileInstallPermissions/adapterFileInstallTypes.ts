import type { LucaLinkAdapterExecutionPlan } from "../adapters";

export type LucaLinkAdapterFileInstallRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";
export type LucaLinkAdapterFileInstallPrivacyLevel =
  | "public"
  | "project"
  | "private"
  | "sensitive";
export type LucaLinkAdapterFileInstallDecisionStatus =
  | "ready_for_review"
  | "approval_required"
  | "blocked"
  | "expired"
  | "unsupported";

interface LucaLinkAdapterPermissionRequestBase {
  requestId: string;
  adapterId: string;
  requestedByHostId: string;
  targetHostId: string;
  createdAt: string;
  expiresAt: string;
  privacyLevel: LucaLinkAdapterFileInstallPrivacyLevel;
  riskLevel: LucaLinkAdapterFileInstallRiskLevel;
  requiresApproval: boolean;
  approvalSatisfied: boolean;
  provenance: string;
  hash?: string;
  signature?: string;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface LucaLinkAdapterFileWritePermissionRequest
  extends LucaLinkAdapterPermissionRequestBase {
  operation: "file_write";
  targetPath: string;
  pathKind:
    | "app_config"
    | "app_data"
    | "temp_sandbox"
    | "cache"
    | "logs"
    | "user_documents"
    | "system_path"
    | "executable_path"
    | "unknown";
  fileType:
    | "json"
    | "text"
    | "manifest"
    | "config"
    | "log"
    | "binary"
    | "script"
    | "executable"
    | "unknown";
  contentSummary: string;
  sizeEstimateBytes?: number;
  overwriteRequested: boolean;
  backupRequired: boolean;
  rollbackPlanSummary?: string;
}

export interface LucaLinkAdapterInstallPermissionRequest
  extends LucaLinkAdapterPermissionRequestBase {
  operation: "install";
  packageName: string;
  packageVersion?: string;
  packageKind:
    | "adapter_manifest"
    | "companion_helper"
    | "browser_bridge"
    | "sensor_bridge"
    | "connector_manifest"
    | "runtime_dependency"
    | "executable_binary"
    | "script_bundle"
    | "unknown";
  installScope:
    | "app_sandbox"
    | "user_profile"
    | "project_workspace"
    | "system_wide"
    | "unknown";
  sourceKind:
    | "bundled_manifest"
    | "verified_registry"
    | "signed_package"
    | "local_declaration"
    | "remote_url"
    | "unknown";
  sourceSummary: string;
  requiredPermissions: string[];
  requiresNetwork: boolean;
  requiresAdmin: boolean;
  requiresShell: boolean;
  rollbackPlanSummary?: string;
  uninstallPlanSummary?: string;
}

export type LucaLinkAdapterFileInstallPermissionRequest =
  | LucaLinkAdapterFileWritePermissionRequest
  | LucaLinkAdapterInstallPermissionRequest;

export type LucaLinkAdapterFileInstallApprovalKind =
  | "user_approval"
  | "privacy_approval"
  | "file_write_approval"
  | "install_approval"
  | "primary_host_approval"
  | "rollback_approval"
  | "security_review"
  | "provenance_review";

export interface LucaLinkAdapterFileInstallApprovalRequirement {
  kind: LucaLinkAdapterFileInstallApprovalKind;
  satisfied: boolean;
  reason: string;
  grantsExecution: false;
}

export interface LucaLinkAdapterFileInstallRequiredEvidenceItem {
  kind:
    | "provenance"
    | "hash"
    | "signature"
    | "rollback_plan"
    | "uninstall_plan"
    | "backup_plan"
    | "target_path_classification"
    | "package_source_classification"
    | "privacy_review"
    | "explicit_user_approval"
    | "primary_host_approval";
  present: boolean;
  summary: string;
}

export interface LucaLinkAdapterFileInstallPermissionDecision {
  decisionId: string;
  requestId: string;
  operation: "file_write" | "install";
  status: LucaLinkAdapterFileInstallDecisionStatus;
  riskLevel: LucaLinkAdapterFileInstallRiskLevel;
  requiredApprovals: LucaLinkAdapterFileInstallApprovalRequirement[];
  requiredEvidence: LucaLinkAdapterFileInstallRequiredEvidenceItem[];
  requiredRollback: boolean;
  allowedForExecution: false;
  writeEnabled: false;
  installEnabled: false;
  sendable: false;
  reason: string;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface LucaLinkAdapterFileInstallEvaluationOptions {
  now?: string | number | Date;
  explicitUserApproval?: boolean;
  primaryHostApproval?: boolean;
  privacyApproval?: boolean;
  securityReview?: boolean;
}

export interface CreateAdapterFileInstallRequestFromPlanOptions {
  operation?: "file_write" | "install";
  requestId?: string;
  createdAt?: string;
  expiresAt?: string;
  targetPath?: string;
  pathKind?: LucaLinkAdapterFileWritePermissionRequest["pathKind"];
  fileType?: LucaLinkAdapterFileWritePermissionRequest["fileType"];
  contentSummary?: string;
  packageName?: string;
  packageKind?: LucaLinkAdapterInstallPermissionRequest["packageKind"];
  installScope?: LucaLinkAdapterInstallPermissionRequest["installScope"];
  sourceKind?: LucaLinkAdapterInstallPermissionRequest["sourceKind"];
  sourceSummary?: string;
  provenance?: string;
  hash?: string;
  signature?: string;
}

export type DeclarativeAdapterPlan = Pick<
  LucaLinkAdapterExecutionPlan,
  | "planId"
  | "adapterId"
  | "requestedByHostId"
  | "targetHostId"
  | "requestedCapabilities"
  | "riskLevel"
  | "status"
  | "blockers"
  | "warnings"
  | "sideEffectsPerformed"
>;
