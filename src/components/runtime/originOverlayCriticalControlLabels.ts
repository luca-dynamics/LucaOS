import { getOriginOverlayCriticalControlPolicy } from "../../services/runtime/OriginOverlayCriticalControlGovernancePolicy";
import type {
  OriginOverlayControlGateRecord,
  OriginOverlayControlGateStatus,
  OriginOverlayControlRiskLevel,
  OriginOverlayCriticalControlId,
  OriginOverlayCriticalControlKind,
  OriginOverlayRequiredApprovalType,
} from "../../types/originOverlayCriticalControls";

export type OriginOverlayCriticalControlTone = "good" | "warn" | "danger" | "neutral" | "info";

export function getOriginOverlayCriticalControlStatusLabel(
  status: OriginOverlayControlGateStatus,
): string {
  switch (status) {
    case "blocked_until_origin_control_policy":
      return "Blocked — Origin critical-control policy required";
    case "needs_dedicated_critical_control_policy":
      return "Blocked — dedicated critical-control policy required";
  }
}

export function getOriginOverlayCriticalControlStatusTone(
  status: OriginOverlayControlGateStatus,
): OriginOverlayCriticalControlTone {
  switch (status) {
    case "blocked_until_origin_control_policy":
    case "needs_dedicated_critical_control_policy":
      return "danger";
  }
}

export function isOriginOverlayCriticalControlBlocked(
  status: OriginOverlayControlGateStatus,
): boolean {
  return (
    status === "blocked_until_origin_control_policy" ||
    status === "needs_dedicated_critical_control_policy"
  );
}

export function getOriginOverlayCriticalControlIdLabel(
  controlId: OriginOverlayCriticalControlId,
): string {
  switch (controlId) {
    case "admin_grant_root":
      return "Admin / root grant";
    case "lockdown_override":
      return "Lockdown override";
    case "hacking_terminal":
      return "Hacking terminal";
    case "smart_tv_remote":
      return "Smart TV remote";
    case "wireless_manager":
      return "Wireless manager";
    case "custom_skill_execution":
      return "Custom skill execution";
    case "subsystem_control":
      return "Subsystem control";
  }
}

export function getOriginOverlayCriticalControlKindLabel(
  kind: OriginOverlayCriticalControlKind,
): string {
  switch (kind) {
    case "root_admin_grant":
      return "Root/admin grant";
    case "lockdown_override":
      return "Lockdown override";
    case "destructive_hacking_tool":
      return "Destructive/hacking tool";
    case "device_control":
      return "Device control";
    case "custom_skill_execution":
      return "Custom skill execution";
    case "privileged_agent_control":
      return "Privileged agent control";
    case "system_override":
      return "System override";
  }
}

export function getOriginOverlayCriticalControlRiskLabel(
  riskLevel: OriginOverlayControlRiskLevel,
): string {
  switch (riskLevel) {
    case "high":
      return "High risk";
    case "critical":
      return "Critical risk";
  }
}

export function getOriginOverlayCriticalControlApprovalTypeLabel(
  approvalType: OriginOverlayRequiredApprovalType,
): string {
  switch (approvalType) {
    case "root_admin_confirmation":
      return "Root/admin confirmation";
    case "lockdown_override_confirmation":
      return "Lockdown override confirmation";
    case "destructive_tool_confirmation":
      return "Destructive tool confirmation";
    case "device_control_confirmation":
      return "Device control confirmation";
    case "custom_skill_confirmation":
      return "Custom skill confirmation";
    case "privileged_agent_control_confirmation":
      return "Privileged agent control confirmation";
  }
}

export function getOriginOverlayCriticalControlSourceComponent(
  controlId: OriginOverlayCriticalControlId,
): string {
  return getOriginOverlayCriticalControlPolicy(controlId).sourceComponent;
}

export function getOriginOverlayCriticalControlCapabilitySummary(
  controlId: OriginOverlayCriticalControlId,
): string[] {
  const policy = getOriginOverlayCriticalControlPolicy(controlId);
  return [
    `can execute tools: ${policy.canExecuteTools}`,
    `can control devices: ${policy.canControlDevices}`,
    `can affect security state: ${policy.canAffectSystemSecurityState}`,
    `can bypass visual core governance: ${policy.canBypassVisualCoreGovernance}`,
  ];
}

export function getOriginOverlayCriticalControlBoundaryLabels(): string[] {
  return [
    "Origin critical-control audit only",
    "No critical control executed",
    "No root/admin grant",
    "No lockdown override",
    "No destructive/hacking tool execution",
    "No device control",
    "No custom skill execution",
    "No approve/execute/grant-root/override-lockdown/control-device/run-skill controls",
    "No OriginOverlayPanels behavior change",
    "No tool execution",
    "No browser automation",
    "No screenshot/OCR/vision",
    "No file access",
    "No messaging execution",
    "No wireless/device control",
    "No wallet/payment",
    "No sensitive-surface enablement",
  ];
}

export function getOriginOverlayCriticalControlSafetyFlagSummary(
  record: OriginOverlayControlGateRecord,
): string[] {
  return [
    `control executed: ${record.controlExecuted}`,
    `root/admin granted: ${record.rootAdminGranted}`,
    `lockdown overridden: ${record.lockdownOverridden}`,
    `destructive action: ${record.destructiveActionEnabled}`,
    `device control: ${record.deviceControlEnabled}`,
    `custom skill execution: ${record.customSkillExecutionEnabled}`,
    `tool execution: ${record.toolExecutionEnabled}`,
    `automation: ${record.automationEnabled}`,
    `external action: ${record.externalActionEnabled}`,
    `file: ${record.fileAccessEnabled}`,
    `messaging: ${record.messagingEnabled}`,
    `wireless: ${record.wirelessControlEnabled}`,
    `wallet/payment: ${record.walletPaymentEnabled}`,
  ];
}
