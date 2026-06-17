import type { LucaLinkAdapterFileInstallPermissionDecision } from "../adapterFileInstallPermissions";
import type { LucaLinkAdapterExecutionPlan } from "../adapters";
import type { LucaLinkApprovalNotification } from "../approvalNotifications";
import type { LucaLinkWebDisplaySessionIntent } from "../display";
import type { LucaLinkReadOnlySensorSnapshot } from "../sensors";
import type { LucaLinkTransportPermissionDecision } from "../transportPermissions";

export type LucaLinkDryRunHandoffSource =
  | "fixture"
  | "adapter_plan"
  | "display_intent"
  | "sensor_snapshot"
  | "transport_decision"
  | "file_install_decision"
  | "future_runtime";
export type LucaLinkDryRunHandoffStatus =
  | "ready_for_review"
  | "approval_required"
  | "blocked"
  | "disabled"
  | "unsupported";
export type LucaLinkDryRunHandoffRiskLevel = "low" | "medium" | "high" | "critical";
export type LucaLinkDryRunHandoffStage =
  | "inspect"
  | "host_scope"
  | "permission_check"
  | "approval_route"
  | "transport_preview"
  | "adapter_preview"
  | "display_preview"
  | "sensor_preview"
  | "file_install_preview"
  | "blocked_handoff"
  | "verify"
  | "audit";

export interface LucaLinkDryRunHandoffStep {
  stepId: string;
  order: number;
  label: string;
  description: string;
  stage: LucaLinkDryRunHandoffStage;
  status: "simulated" | "skipped" | "blocked" | "requires_review";
  wouldRequire: string[];
  wouldBlock: string[];
  sideEffectsPerformed: false;
}

export interface LucaLinkDryRunApprovalPath {
  primaryHostApprovalRequired: boolean;
  companionHostNotificationRequired: boolean;
  displayHostApprovalRequired: boolean;
  fileInstallSecurityReviewRequired: boolean;
  transportApprovalRequired: boolean;
  sensorLiveCollectionBlocked: true;
  informationalOnly: true;
  requiredApprovals: string[];
  missingApprovals: string[];
}

export interface LucaLinkDryRunHandoffInput {
  source?: LucaLinkDryRunHandoffSource;
  adapterPlan?: LucaLinkAdapterExecutionPlan;
  displayIntent?: LucaLinkWebDisplaySessionIntent;
  approvalNotification?: LucaLinkApprovalNotification;
  sensorSnapshot?: LucaLinkReadOnlySensorSnapshot;
  transportPermissionDecision?: LucaLinkTransportPermissionDecision;
  adapterFileInstallDecision?: LucaLinkAdapterFileInstallPermissionDecision;
  requestedByHostId?: string;
  targetHostId?: string;
  targetDeviceId?: string;
  now?: string | number | Date;
}

export interface LucaLinkDryRunHandoffPolicyResult {
  status: LucaLinkDryRunHandoffStatus;
  riskLevel: LucaLinkDryRunHandoffRiskLevel;
  requiredApprovals: string[];
  missingApprovals: string[];
  blockedActions: string[];
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface LucaLinkDryRunHandoffSimulation {
  simulationId: string;
  createdAt: string;
  source: LucaLinkDryRunHandoffSource;
  status: LucaLinkDryRunHandoffStatus;
  riskLevel: LucaLinkDryRunHandoffRiskLevel;
  dryRunOnly: true;
  sideEffectsPerformed: false;
  handoffEnabled: false;
  transportSendEnabled: false;
  adapterExecutionEnabled: false;
  displayOpenEnabled: false;
  sensorCollectionEnabled: false;
  fileWriteEnabled: false;
  installEnabled: false;
  requestedByHostId?: string;
  targetHostId?: string;
  targetDeviceId?: string;
  messageClass?: string;
  transportChannel?: string;
  approvalPath: LucaLinkDryRunApprovalPath;
  simulatedSteps: LucaLinkDryRunHandoffStep[];
  requiredApprovals: string[];
  missingApprovals: string[];
  transportSummary: string;
  adapterSummary: string;
  displaySummary: string;
  sensorSummary: string;
  fileInstallSummary: string;
  blockedActions: string[];
  warnings: string[];
  blockers: string[];
}

export interface LucaLinkDryRunHandoffReadiness {
  totalSimulations: number;
  readyForReview: number;
  approvalRequired: number;
  blocked: number;
  disabled: number;
  unsupported: number;
  dryRunOnly: true;
  handoffEnabled: false;
  transportSendEnabled: false;
  adapterExecutionEnabled: false;
  displayOpenEnabled: false;
  sensorCollectionEnabled: false;
  fileWriteEnabled: false;
  installEnabled: false;
  sideEffectsPerformed: false;
  warnings: string[];
  blockers: string[];
}

export type LucaLinkDryRunHandoffAuditEventType =
  | "created"
  | "simulated"
  | "approval_required"
  | "blocked"
  | "ready_for_review"
  | "unsupported"
  | "verified";

export interface LucaLinkDryRunHandoffAuditRecord {
  auditId: string;
  simulationId: string;
  timestamp: string;
  eventType: LucaLinkDryRunHandoffAuditEventType;
  summary: string;
  blockedActions: string[];
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface LucaLinkDryRunHandoffAuditSummary {
  totalRecords: number;
  approvalRequired: number;
  blocked: number;
  readyForReview: number;
  unsupported: number;
  verified: number;
  sideEffectsPerformed: false;
  warnings: string[];
  blockers: string[];
}
