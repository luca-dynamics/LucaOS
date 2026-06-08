export type OperationCenterSource =
  | "personal_intelligence"
  | "lucalink"
  | "runtime"
  | "system";

export type OperationCenterCategory =
  | "memory_approval"
  | "runtime_trace"
  | "learning_event"
  | "mission_alignment"
  | "skill_registry"
  | "skill_sandbox"
  | "skill_dry_run"
  | "skill_permission_gate"
  | "runtime_authority"
  | "adapter_sandbox"
  | "web_display"
  | "approval_notification"
  | "sensor_bridge"
  | "transport_permission"
  | "adapter_file_install"
  | "lucalink_dry_run"
  | "lucalink_runtime_authority"
  | "runtime_approval"
  | "blocked_action";

export type OperationCenterStatus =
  | "ready_for_review"
  | "approval_required"
  | "pending"
  | "granted_for_review"
  | "denied"
  | "expired"
  | "blocked"
  | "unsupported"
  | "model_only"
  | "read_only"
  | "disabled";

export type OperationCenterRiskLevel = "low" | "medium" | "high" | "critical";

export interface OperationCenterItem {
  itemId: string;
  source: OperationCenterSource;
  category: OperationCenterCategory;
  title: string;
  summary: string;
  status: OperationCenterStatus;
  riskLevel: OperationCenterRiskLevel;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;
  relatedSkillId?: string;
  relatedPlanId?: string;
  relatedTraceId?: string;
  relatedMissionId?: string;
  relatedHostId?: string;
  relatedRequestId?: string;
  requiredApprovals: string[];
  blockedActions: string[];
  warnings: string[];
  blockers: string[];
  auditSummary?: string;
  authorityGranted: false;
  executionEnabled: false;
  canExecute: false;
  readyForExecution: false;
  handoffEnabled: false;
  transportSendEnabled: false;
  adapterExecutionEnabled: false;
  displayOpenEnabled: false;
  sensorCollectionEnabled: false;
  fileWriteEnabled: false;
  installEnabled: false;
  sideEffectsPerformed: false;
}

export interface OperationCenterSummary {
  totalItems: number;
  pending: number;
  approvalRequired: number;
  grantedForReview: number;
  denied: number;
  expired: number;
  blocked: number;
  unsupported: number;
  modelOnly: number;
  readOnly: number;
  disabled: number;
  personalIntelligenceCount: number;
  lucaLinkCount: number;
  highRiskCount: number;
  criticalRiskCount: number;
  authorityGranted: false;
  readyForExecution: false;
  executionEnabled: false;
  canExecute: false;
  handoffEnabled: false;
  transportSendEnabled: false;
  adapterExecutionEnabled: false;
  displayOpenEnabled: false;
  sensorCollectionEnabled: false;
  fileWriteEnabled: false;
  installEnabled: false;
  readyForLiveSend: false;
  writeEnabled: false;
  liveCollectionEnabled: false;
  sideEffectsPerformed: false;
  warnings: string[];
  blockers: string[];
}

export interface OperationCenterReadiness extends OperationCenterSummary {
  topPendingApprovals: OperationCenterItem[];
  topBlockedActions: string[];
}
