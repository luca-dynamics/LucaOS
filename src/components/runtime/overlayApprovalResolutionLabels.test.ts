import { describe, expect, it } from "vitest";
import {
  getOverlayApprovalResolutionBoundaryLabels,
  getOverlayApprovalResolutionDecisionLabel,
  getOverlayApprovalResolutionSafetyFlagSummary,
  getOverlayApprovalResolutionSourceLabel,
  getOverlayApprovalResolutionStatusLabel,
  getOverlayApprovalResolutionStatusTone,
  isOverlayApprovalResolutionBlocked,
} from "./overlayApprovalResolutionLabels";
import type {
  OverlayApprovalResolutionRecord,
  OverlayApprovalResolutionStatus,
} from "../../types/overlayApprovalResolution";

const STATUSES: OverlayApprovalResolutionStatus[] = [
  "recorded",
  "resolved",
  "blocked_no_pending_request",
  "blocked_unrecognized_decision",
];

function makeRecord(
  overrides: Partial<OverlayApprovalResolutionRecord> = {},
): OverlayApprovalResolutionRecord {
  return {
    approvalResolutionId: "overlay-approval-resolution:test:abc123",
    source: "voice_hud",
    decision: "approve",
    status: "resolved",
    timestamp: "2026-01-01T00:00:00.000Z",
    userSafeReason: "Resolved through governed approval resolution.",
    governanceApplied: true,
    approvalResolutionOnly: true,
    executionChanged: false,
    toolExecutionEnabled: false,
    captureEnabled: false,
    automationEnabled: false,
    externalActionEnabled: false,
    fileAccessEnabled: false,
    messagingEnabled: false,
    wirelessControlEnabled: false,
    walletPaymentEnabled: false,
    sensitiveSurfaceEnabled: false,
    ...overrides,
  };
}

describe("overlayApprovalResolutionLabels", () => {
  it("maps every status to a non-empty label and tone", () => {
    for (const status of STATUSES) {
      expect(getOverlayApprovalResolutionStatusLabel(status)).toBeTruthy();
      expect(getOverlayApprovalResolutionStatusTone(status)).toBeTruthy();
    }
  });

  it("labels blocked/no-pending and blocked/unrecognized as blocked non-actionable statuses", () => {
    expect(isOverlayApprovalResolutionBlocked("blocked_no_pending_request")).toBe(true);
    expect(isOverlayApprovalResolutionBlocked("blocked_unrecognized_decision")).toBe(true);
    expect(getOverlayApprovalResolutionStatusLabel("blocked_no_pending_request").toLowerCase()).toContain("blocked");
    expect(getOverlayApprovalResolutionStatusLabel("blocked_unrecognized_decision").toLowerCase()).toContain("blocked");
    expect(getOverlayApprovalResolutionStatusTone("blocked_no_pending_request")).toBe("danger");
    expect(getOverlayApprovalResolutionStatusTone("blocked_unrecognized_decision")).toBe("danger");
  });

  it("labels resolved records as audit evidence only", () => {
    expect(isOverlayApprovalResolutionBlocked("resolved")).toBe(false);
    expect(getOverlayApprovalResolutionStatusLabel("resolved").toLowerCase()).toContain("audit evidence only");
    expect(getOverlayApprovalResolutionStatusTone("resolved")).toBe("good");
  });

  it("maps source and decision labels", () => {
    expect(getOverlayApprovalResolutionSourceLabel("voice_hud")).toBe("VoiceHud");
    expect(getOverlayApprovalResolutionSourceLabel("security_gate")).toBe("SecurityGate");
    expect(getOverlayApprovalResolutionDecisionLabel("approve")).toBe("Approve");
    expect(getOverlayApprovalResolutionDecisionLabel("deny")).toBe("Deny");
    expect(getOverlayApprovalResolutionDecisionLabel("unknown")).toBe("Unknown");
  });

  it("exposes fixed visibility-only boundary labels", () => {
    const labels = getOverlayApprovalResolutionBoundaryLabels();
    expect(labels).toContain("Approval-resolution audit only");
    expect(labels).toContain("No VoiceHud behavior change");
    expect(labels).toContain("No SecurityGate behavior change");
    expect(labels).toContain("No approve/deny/run/execute controls");
    expect(labels).toContain("No tool execution");
    expect(labels).toContain("No automation");
    expect(labels).toContain("No screenshot/OCR/vision");
  });

  it("summarizes dangerous safety flags as false", () => {
    const summary = getOverlayApprovalResolutionSafetyFlagSummary(makeRecord());
    for (const chip of summary) {
      expect(chip.endsWith("false")).toBe(true);
    }
    expect(summary).toContain("execution changed: false");
    expect(summary).toContain("tool execution: false");
    expect(summary).toContain("automation: false");
    expect(summary).toContain("sensitive surface: false");
  });
});
