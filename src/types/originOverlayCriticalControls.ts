export type OriginOverlayCriticalControlId =
  | "admin_grant_root"
  | "lockdown_override"
  | "hacking_terminal"
  | "smart_tv_remote"
  | "wireless_manager"
  | "custom_skill_execution"
  | "subsystem_control";

export type OriginOverlayCriticalControlKind =
  | "root_admin_grant"
  | "lockdown_override"
  | "destructive_hacking_tool"
  | "device_control"
  | "custom_skill_execution"
  | "privileged_agent_control"
  | "system_override";

export type OriginOverlayControlRiskLevel = "high" | "critical";

export type OriginOverlayControlGateStatus =
  | "blocked_until_origin_control_policy"
  | "needs_dedicated_critical_control_policy";

export type OriginOverlayRequiredApprovalType =
  | "root_admin_confirmation"
  | "lockdown_override_confirmation"
  | "destructive_tool_confirmation"
  | "device_control_confirmation"
  | "custom_skill_confirmation"
  | "privileged_agent_control_confirmation";

export interface OriginOverlayCriticalControlPolicy {
  controlId: OriginOverlayCriticalControlId;
  sourceComponent: string;
  sourceFile: string;
  controlKind: OriginOverlayCriticalControlKind;
  riskLevel: OriginOverlayControlRiskLevel;
  canExecuteTools: boolean;
  canControlDevices: boolean;
  canAffectSystemSecurityState: boolean;
  canBypassVisualCoreGovernance: boolean;
  canBypassOverlayManagerGovernance: boolean;
  requiredFutureApprovalType: OriginOverlayRequiredApprovalType;
  defaultStatus: OriginOverlayControlGateStatus;
  recommendedFutureApprovalCopy: string;
  userSafeReason: string;
}

export interface OriginOverlayCriticalControlSafetyFlags {
  governanceApplied: true;
  criticalControlGateStubOnly: true;
  controlExecuted: false;
  rootAdminGranted: false;
  lockdownOverridden: false;
  destructiveActionEnabled: false;
  deviceControlEnabled: false;
  customSkillExecutionEnabled: false;
  toolExecutionEnabled: false;
  automationEnabled: false;
  externalActionEnabled: false;
  fileAccessEnabled: false;
  messagingEnabled: false;
  wirelessControlEnabled: false;
  walletPaymentEnabled: false;
}

export interface OriginOverlayControlGateDecision extends OriginOverlayCriticalControlSafetyFlags {
  controlId: OriginOverlayCriticalControlId;
  controlKind: OriginOverlayCriticalControlKind;
  riskLevel: OriginOverlayControlRiskLevel;
  status: OriginOverlayControlGateStatus;
  allowed: false;
  blockedBy: string[];
  requiredFutureApprovalType: OriginOverlayRequiredApprovalType;
  recommendedFutureApprovalCopy: string;
  userSafeReason: string;
}

export interface OriginOverlayControlGateRecord extends OriginOverlayControlGateDecision {
  originOverlayControlGateRecordId: string;
  timestamp: string;
}

export interface OriginOverlayControlGateDiagnosticsSummary extends OriginOverlayCriticalControlSafetyFlags {
  totalRecords: number;
  blockedUntilOriginControlPolicyAttempts: number;
  needsDedicatedCriticalControlPolicyAttempts: number;
  lastAttemptAt: string | null;
  controls: OriginOverlayCriticalControlId[];
}

export const ORIGIN_OVERLAY_CRITICAL_CONTROL_IDS: OriginOverlayCriticalControlId[] = [
  "admin_grant_root",
  "lockdown_override",
  "hacking_terminal",
  "smart_tv_remote",
  "wireless_manager",
  "custom_skill_execution",
  "subsystem_control",
];

export const MAX_ORIGIN_OVERLAY_CONTROL_GATE_RECORDS = 100;
export const ORIGIN_OVERLAY_CONTROL_GATE_EVENT = "origin_overlay_critical_control_gate";
