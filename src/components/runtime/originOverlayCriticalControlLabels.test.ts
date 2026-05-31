import { describe, expect, it } from "vitest";
import {
  getOriginOverlayCriticalControlApprovalTypeLabel,
  getOriginOverlayCriticalControlBoundaryLabels,
  getOriginOverlayCriticalControlCapabilitySummary,
  getOriginOverlayCriticalControlIdLabel,
  getOriginOverlayCriticalControlKindLabel,
  getOriginOverlayCriticalControlRiskLabel,
  getOriginOverlayCriticalControlSafetyFlagSummary,
  getOriginOverlayCriticalControlSourceComponent,
  getOriginOverlayCriticalControlStatusLabel,
  getOriginOverlayCriticalControlStatusTone,
  isOriginOverlayCriticalControlBlocked,
} from "./originOverlayCriticalControlLabels";
import {
  ORIGIN_OVERLAY_CRITICAL_CONTROL_IDS,
  type OriginOverlayControlGateRecord,
  type OriginOverlayControlGateStatus,
  type OriginOverlayCriticalControlKind,
  type OriginOverlayControlRiskLevel,
  type OriginOverlayRequiredApprovalType,
} from "../../types/originOverlayCriticalControls";

const STATUSES: OriginOverlayControlGateStatus[] = [
  "blocked_until_origin_control_policy",
  "needs_dedicated_critical_control_policy",
];

const KINDS: OriginOverlayCriticalControlKind[] = [
  "root_admin_grant",
  "lockdown_override",
  "destructive_hacking_tool",
  "device_control",
  "custom_skill_execution",
  "privileged_agent_control",
  "system_override",
];

const RISK_LEVELS: OriginOverlayControlRiskLevel[] = ["high", "critical"];

const APPROVAL_TYPES: OriginOverlayRequiredApprovalType[] = [
  "root_admin_confirmation",
  "lockdown_override_confirmation",
  "destructive_tool_confirmation",
  "device_control_confirmation",
  "custom_skill_confirmation",
  "privileged_agent_control_confirmation",
];

function makeRecord(
  overrides: Partial<OriginOverlayControlGateRecord> = {},
): OriginOverlayControlGateRecord {
  return {
    originOverlayControlGateRecordId: "origin-overlay-control:test:abc123",
    controlId: "admin_grant_root",
    controlKind: "root_admin_grant",
    riskLevel: "critical",
    status: "blocked_until_origin_control_policy",
    allowed: false,
    blockedBy: ["blocked_until_origin_control_policy", "origin_overlay_critical_control_gate_stub"],
    requiredFutureApprovalType: "root_admin_confirmation",
    recommendedFutureApprovalCopy: "Grant ROOT/admin access for this Origin overlay action?",
    userSafeReason: "Needs a dedicated Origin critical-control policy.",
    governanceApplied: true,
    criticalControlGateStubOnly: true,
    controlExecuted: false,
    rootAdminGranted: false,
    lockdownOverridden: false,
    destructiveActionEnabled: false,
    deviceControlEnabled: false,
    customSkillExecutionEnabled: false,
    toolExecutionEnabled: false,
    automationEnabled: false,
    externalActionEnabled: false,
    fileAccessEnabled: false,
    messagingEnabled: false,
    wirelessControlEnabled: false,
    walletPaymentEnabled: false,
    timestamp: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("originOverlayCriticalControlLabels", () => {
  it("labels every gate status as blocked/non-actionable", () => {
    for (const status of STATUSES) {
      expect(isOriginOverlayCriticalControlBlocked(status)).toBe(true);
      expect(getOriginOverlayCriticalControlStatusLabel(status).toLowerCase()).toContain("blocked");
      expect(getOriginOverlayCriticalControlStatusTone(status)).toBe("danger");
    }
  });

  it("maps control id, kind, risk, and approval type labels", () => {
    for (const id of ORIGIN_OVERLAY_CRITICAL_CONTROL_IDS) {
      expect(getOriginOverlayCriticalControlIdLabel(id)).toBeTruthy();
    }
    for (const kind of KINDS) {
      expect(getOriginOverlayCriticalControlKindLabel(kind)).toBeTruthy();
    }
    for (const risk of RISK_LEVELS) {
      expect(getOriginOverlayCriticalControlRiskLabel(risk).toLowerCase()).toContain("risk");
    }
    for (const approval of APPROVAL_TYPES) {
      expect(getOriginOverlayCriticalControlApprovalTypeLabel(approval)).toBeTruthy();
    }
    expect(getOriginOverlayCriticalControlIdLabel("hacking_terminal")).toContain("Hacking");
    expect(getOriginOverlayCriticalControlKindLabel("destructive_hacking_tool")).toContain("Destructive");
  });

  it("reads source component and capability context from the policy without enabling anything", () => {
    expect(getOriginOverlayCriticalControlSourceComponent("hacking_terminal")).toBe("HackingTerminal");
    const summary = getOriginOverlayCriticalControlCapabilitySummary("hacking_terminal");
    expect(summary).toContain("can execute tools: true");
    expect(summary).toContain("can control devices: true");
    expect(summary).toContain("can affect security state: true");
    expect(summary).toContain("can bypass visual core governance: true");
  });

  it("exposes fixed visibility-only boundary labels", () => {
    const labels = getOriginOverlayCriticalControlBoundaryLabels();
    expect(labels).toContain("Origin critical-control audit only");
    expect(labels).toContain("No critical control executed");
    expect(labels).toContain("No root/admin grant");
    expect(labels).toContain("No lockdown override");
    expect(labels).toContain("No device control");
    expect(labels).toContain("No custom skill execution");
    expect(labels).toContain(
      "No approve/execute/grant-root/override-lockdown/control-device/run-skill controls",
    );
    expect(labels).toContain("No OriginOverlayPanels behavior change");
    expect(labels).toContain("No tool execution");
    expect(labels).toContain("No browser automation");
    expect(labels).toContain("No screenshot/OCR/vision");
    expect(labels).toContain("No file access");
    expect(labels).toContain("No messaging execution");
    expect(labels).toContain("No wireless/device control");
    expect(labels).toContain("No wallet/payment");
  });

  it("keeps every safety flag in the summary false", () => {
    const summary = getOriginOverlayCriticalControlSafetyFlagSummary(makeRecord());
    for (const chip of summary) {
      expect(chip.endsWith("false")).toBe(true);
    }
    expect(summary).toContain("control executed: false");
    expect(summary).toContain("root/admin granted: false");
    expect(summary).toContain("lockdown overridden: false");
    expect(summary).toContain("destructive action: false");
    expect(summary).toContain("device control: false");
    expect(summary).toContain("custom skill execution: false");
    expect(summary).toContain("tool execution: false");
    expect(summary).toContain("automation: false");
    expect(summary).toContain("file: false");
    expect(summary).toContain("messaging: false");
    expect(summary).toContain("wireless: false");
    expect(summary).toContain("wallet/payment: false");
  });
});
