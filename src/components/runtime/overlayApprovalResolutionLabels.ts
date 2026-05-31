import type {
  OverlayApprovalResolutionDecision,
  OverlayApprovalResolutionRecord,
  OverlayApprovalResolutionSource,
  OverlayApprovalResolutionStatus,
} from "../../types/overlayApprovalResolution";

export type OverlayApprovalResolutionTone = "good" | "warn" | "danger" | "neutral" | "info";

export function getOverlayApprovalResolutionStatusLabel(
  status: OverlayApprovalResolutionStatus,
): string {
  switch (status) {
    case "recorded": return "Recorded audit attempt";
    case "resolved": return "Resolved — audit evidence only";
    case "blocked_no_pending_request": return "Blocked — no pending request";
    case "blocked_unrecognized_decision": return "Blocked — unrecognized decision";
  }
}

export function getOverlayApprovalResolutionStatusTone(
  status: OverlayApprovalResolutionStatus,
): OverlayApprovalResolutionTone {
  switch (status) {
    case "recorded": return "info";
    case "resolved": return "good";
    case "blocked_no_pending_request":
    case "blocked_unrecognized_decision":
      return "danger";
  }
}

export function isOverlayApprovalResolutionBlocked(
  status: OverlayApprovalResolutionStatus,
): boolean {
  return status === "blocked_no_pending_request" || status === "blocked_unrecognized_decision";
}

export function getOverlayApprovalResolutionSourceLabel(
  source: OverlayApprovalResolutionSource,
): string {
  switch (source) {
    case "voice_hud": return "VoiceHud";
    case "security_gate": return "SecurityGate";
  }
}

export function getOverlayApprovalResolutionDecisionLabel(
  decision: OverlayApprovalResolutionDecision | "unknown",
): string {
  switch (decision) {
    case "approve": return "Approve";
    case "deny": return "Deny";
    case "unknown": return "Unknown";
  }
}

export function getOverlayApprovalResolutionBoundaryLabels(): string[] {
  return [
    "Approval-resolution audit only",
    "No VoiceHud behavior change",
    "No SecurityGate behavior change",
    "No OverlayManager behavior change",
    "No approve/deny/run/execute controls",
    "No tool execution",
    "No automation",
    "No DOM read",
    "No click/type/scroll",
    "No screenshot/OCR/vision",
    "No capture",
    "No file access",
    "No messaging",
    "No wireless/device control",
    "No sensitive-surface enablement",
  ];
}

export function getOverlayApprovalResolutionSafetyFlagSummary(
  record: OverlayApprovalResolutionRecord,
): string[] {
  return [
    `execution changed: ${record.executionChanged}`,
    `tool execution: ${record.toolExecutionEnabled}`,
    `capture: ${record.captureEnabled}`,
    `automation: ${record.automationEnabled}`,
    `external action: ${record.externalActionEnabled}`,
    `file: ${record.fileAccessEnabled}`,
    `messaging: ${record.messagingEnabled}`,
    `wireless: ${record.wirelessControlEnabled}`,
    `wallet/payment: ${record.walletPaymentEnabled}`,
    `sensitive surface: ${record.sensitiveSurfaceEnabled}`,
  ];
}
