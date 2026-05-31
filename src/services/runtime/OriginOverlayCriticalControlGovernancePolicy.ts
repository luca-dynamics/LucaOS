import {
  ORIGIN_OVERLAY_CRITICAL_CONTROL_IDS,
  type OriginOverlayControlGateStatus,
  type OriginOverlayCriticalControlId,
  type OriginOverlayCriticalControlKind,
  type OriginOverlayCriticalControlPolicy,
} from "../../types/originOverlayCriticalControls";

const SOURCE = "src/surfaces/origin/OriginOverlayPanels.tsx";

const POLICIES: Record<OriginOverlayCriticalControlId, OriginOverlayCriticalControlPolicy> = {
  admin_grant_root: {
    controlId: "admin_grant_root",
    sourceComponent: "AdminGrantModal",
    sourceFile: "src/components/AdminGrantModal.tsx",
    controlKind: "root_admin_grant",
    riskLevel: "critical",
    canExecuteTools: true,
    canControlDevices: false,
    canAffectSystemSecurityState: true,
    canBypassVisualCoreGovernance: true,
    canBypassOverlayManagerGovernance: true,
    requiredFutureApprovalType: "root_admin_confirmation",
    defaultStatus: "blocked_until_origin_control_policy",
    recommendedFutureApprovalCopy: "Grant ROOT/admin access for this Origin overlay action?",
    userSafeReason: "ROOT/admin grants can bypass safety protocols and execute privileged system actions, so this control needs a dedicated Origin critical-control policy.",
  },
  lockdown_override: {
    controlId: "lockdown_override",
    sourceComponent: "OriginOverlayPanels lockdown override",
    sourceFile: SOURCE,
    controlKind: "lockdown_override",
    riskLevel: "critical",
    canExecuteTools: false,
    canControlDevices: false,
    canAffectSystemSecurityState: true,
    canBypassVisualCoreGovernance: true,
    canBypassOverlayManagerGovernance: true,
    requiredFutureApprovalType: "lockdown_override_confirmation",
    defaultStatus: "blocked_until_origin_control_policy",
    recommendedFutureApprovalCopy: "Override LucaOS lockdown for this Origin overlay action?",
    userSafeReason: "Lockdown override affects the system security state and must stay blocked until a dedicated Origin critical-control policy exists.",
  },
  hacking_terminal: {
    controlId: "hacking_terminal",
    sourceComponent: "HackingTerminal",
    sourceFile: "src/components/HackingTerminal.tsx",
    controlKind: "destructive_hacking_tool",
    riskLevel: "critical",
    canExecuteTools: true,
    canControlDevices: true,
    canAffectSystemSecurityState: true,
    canBypassVisualCoreGovernance: true,
    canBypassOverlayManagerGovernance: true,
    requiredFutureApprovalType: "destructive_tool_confirmation",
    defaultStatus: "blocked_until_origin_control_policy",
    recommendedFutureApprovalCopy: "Run this destructive/security tool from the Origin hacking terminal?",
    userSafeReason: "The hacking terminal exposes destructive/security tooling and C2 command paths, so actions need a dedicated critical-control policy.",
  },
  smart_tv_remote: {
    controlId: "smart_tv_remote",
    sourceComponent: "SmartTVRemote",
    sourceFile: "src/components/SmartTVRemote.tsx",
    controlKind: "device_control",
    riskLevel: "high",
    canExecuteTools: true,
    canControlDevices: true,
    canAffectSystemSecurityState: false,
    canBypassVisualCoreGovernance: true,
    canBypassOverlayManagerGovernance: true,
    requiredFutureApprovalType: "device_control_confirmation",
    defaultStatus: "needs_dedicated_critical_control_policy",
    recommendedFutureApprovalCopy: "Send this command to a smart TV/device from the Origin overlay?",
    userSafeReason: "Smart TV remote actions can control external devices and need a dedicated critical-control policy.",
  },
  wireless_manager: {
    controlId: "wireless_manager",
    sourceComponent: "WirelessManager",
    sourceFile: "src/components/WirelessManager.tsx",
    controlKind: "device_control",
    riskLevel: "critical",
    canExecuteTools: true,
    canControlDevices: true,
    canAffectSystemSecurityState: true,
    canBypassVisualCoreGovernance: true,
    canBypassOverlayManagerGovernance: true,
    requiredFutureApprovalType: "device_control_confirmation",
    defaultStatus: "blocked_until_origin_control_policy",
    recommendedFutureApprovalCopy: "Connect or control this wireless device from the Origin overlay?",
    userSafeReason: "Wireless manager actions can affect nearby devices/network state and need a dedicated Origin critical-control policy.",
  },
  custom_skill_execution: {
    controlId: "custom_skill_execution",
    sourceComponent: "SkillsMatrix",
    sourceFile: "src/components/SkillsMatrix.tsx",
    controlKind: "custom_skill_execution",
    riskLevel: "critical",
    canExecuteTools: true,
    canControlDevices: false,
    canAffectSystemSecurityState: true,
    canBypassVisualCoreGovernance: true,
    canBypassOverlayManagerGovernance: true,
    requiredFutureApprovalType: "custom_skill_confirmation",
    defaultStatus: "blocked_until_origin_control_policy",
    recommendedFutureApprovalCopy: "Execute this custom skill from the Origin overlay?",
    userSafeReason: "Custom skill execution can run user-defined code/tool paths and needs a dedicated critical-control policy.",
  },
  subsystem_control: {
    controlId: "subsystem_control",
    sourceComponent: "SubsystemDashboard",
    sourceFile: "src/components/SubsystemDashboard.tsx",
    controlKind: "privileged_agent_control",
    riskLevel: "critical",
    canExecuteTools: true,
    canControlDevices: false,
    canAffectSystemSecurityState: true,
    canBypassVisualCoreGovernance: true,
    canBypassOverlayManagerGovernance: true,
    requiredFutureApprovalType: "privileged_agent_control_confirmation",
    defaultStatus: "blocked_until_origin_control_policy",
    recommendedFutureApprovalCopy: "Stop, restart, or remove this subsystem from the Origin overlay?",
    userSafeReason: "Subsystem controls can stop/restart/remove runtime components and need a dedicated Origin critical-control policy.",
  },
};

const KIND_STATUSES: Record<OriginOverlayCriticalControlKind, OriginOverlayControlGateStatus> = {
  root_admin_grant: "blocked_until_origin_control_policy",
  lockdown_override: "blocked_until_origin_control_policy",
  destructive_hacking_tool: "blocked_until_origin_control_policy",
  device_control: "needs_dedicated_critical_control_policy",
  custom_skill_execution: "blocked_until_origin_control_policy",
  privileged_agent_control: "blocked_until_origin_control_policy",
  system_override: "blocked_until_origin_control_policy",
};

export function listOriginOverlayCriticalControlPolicies(): OriginOverlayCriticalControlPolicy[] {
  return ORIGIN_OVERLAY_CRITICAL_CONTROL_IDS.map((id) => ({ ...POLICIES[id] }));
}

export function getOriginOverlayCriticalControlPolicy(
  controlId: OriginOverlayCriticalControlId,
): OriginOverlayCriticalControlPolicy {
  return { ...POLICIES[controlId] };
}

export function getOriginOverlayCriticalControlGateDecision(
  controlId: OriginOverlayCriticalControlId,
) {
  const policy = getOriginOverlayCriticalControlPolicy(controlId);
  const status = KIND_STATUSES[policy.controlKind] ?? policy.defaultStatus;
  return {
    controlId,
    controlKind: policy.controlKind,
    riskLevel: policy.riskLevel,
    status,
    allowed: false as const,
    blockedBy: [status, "origin_overlay_critical_control_gate_stub"],
    requiredFutureApprovalType: policy.requiredFutureApprovalType,
    recommendedFutureApprovalCopy: policy.recommendedFutureApprovalCopy,
    userSafeReason: policy.userSafeReason,
  };
}

export function getOriginOverlayCriticalControlGovernanceSummary() {
  const policies = listOriginOverlayCriticalControlPolicies();
  return {
    totalControls: policies.length,
    mappedControls: policies.map((policy) => policy.controlId),
    criticalControls: policies.filter((policy) => policy.riskLevel === "critical").length,
    toolExecutingControls: policies.filter((policy) => policy.canExecuteTools).length,
    deviceControlControls: policies.filter((policy) => policy.canControlDevices).length,
    systemSecurityControls: policies.filter((policy) => policy.canAffectSystemSecurityState).length,
  };
}

export function assertKnownOriginOverlayCriticalControlMap(): boolean {
  const mapped = listOriginOverlayCriticalControlPolicies().map((policy) => policy.controlId).sort();
  return JSON.stringify(mapped) === JSON.stringify([...ORIGIN_OVERLAY_CRITICAL_CONTROL_IDS].sort());
}
