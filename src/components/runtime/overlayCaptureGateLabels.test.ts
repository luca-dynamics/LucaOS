import { describe, expect, it } from "vitest";
import {
  getOverlayCaptureGateBoundaryLabels,
  getOverlayCaptureGateSafetyFlagSummary,
  getOverlayCaptureGateStatusLabel,
  getOverlayCaptureGateStatusTone,
  getOverlayCaptureKindSummary,
  getOverlayCaptureSurfaceLabel,
  isOverlayCaptureGateBlocked,
} from "./overlayCaptureGateLabels";
import {
  OVERLAY_CAPTURE_SURFACE_IDS,
  type OverlayCaptureActivationStatus,
  type OverlayCaptureGateRecord,
} from "../../types/overlayCaptureGovernance";

const STATUSES: OverlayCaptureActivationStatus[] = [
  "blocked_until_dedicated_policy",
  "needs_explicit_capture_policy",
];

function makeRecord(
  overrides: Partial<OverlayCaptureGateRecord> = {},
): OverlayCaptureGateRecord {
  return {
    captureGateRecordId: "overlay-capture-gate:test:abc123",
    surfaceId: "screen_share",
    sourceComponent: "ScreenShare",
    captures: ["screen"],
    riskLevel: "high",
    status: "needs_explicit_capture_policy",
    allowed: false,
    blockedBy: ["needs_explicit_capture_policy"],
    canBypassVisualCoreGovernance: true,
    canInvokeTools: false,
    needsExplicitActivationGate: true,
    recommendedFutureApprovalCopy: "Allow ScreenShare to capture screen frames?",
    timestamp: "2026-01-01T00:00:00.000Z",
    userSafeReason: "ScreenShare needs a dedicated explicit activation policy.",
    governanceApplied: true,
    activationGateStubOnly: true,
    captureStarted: false,
    captureStopped: false,
    capturePermissionRequested: false,
    executionChanged: false,
    toolExecutionEnabled: false,
    automationEnabled: false,
    externalActionEnabled: false,
    fileAccessEnabled: false,
    messagingEnabled: false,
    wirelessControlEnabled: false,
    walletPaymentEnabled: false,
    ...overrides,
  };
}

describe("overlayCaptureGateLabels", () => {
  it("labels every capture gate status as blocked/non-actionable", () => {
    for (const status of STATUSES) {
      expect(isOverlayCaptureGateBlocked(status)).toBe(true);
      expect(getOverlayCaptureGateStatusLabel(status).toLowerCase()).toContain("blocked");
      expect(getOverlayCaptureGateStatusTone(status)).toBe("danger");
    }
  });

  it("maps every capture surface to a label", () => {
    for (const surfaceId of OVERLAY_CAPTURE_SURFACE_IDS) {
      expect(getOverlayCaptureSurfaceLabel(surfaceId)).toBeTruthy();
    }
    expect(getOverlayCaptureSurfaceLabel("luca_recorder")).toBe("LucaRecorder");
  });

  it("summarizes capture kinds", () => {
    expect(getOverlayCaptureKindSummary(["screen", "audio", "recording"])).toBe("screen, audio, recording");
    expect(getOverlayCaptureKindSummary([])).toBe("unknown");
  });

  it("exposes fixed visibility-only boundary labels", () => {
    const labels = getOverlayCaptureGateBoundaryLabels();
    expect(labels).toContain("Capture gate audit only");
    expect(labels).toContain("No capture start/stop");
    expect(labels).toContain("No permission request");
    expect(labels).toContain("No approve/start/stop/capture controls");
    expect(labels).toContain("No screenshot/OCR/vision");
    expect(labels).toContain("No tool execution");
  });

  it("summarizes capture and execution safety flags as false", () => {
    const summary = getOverlayCaptureGateSafetyFlagSummary(makeRecord());
    for (const chip of summary) {
      expect(chip.endsWith("false")).toBe(true);
    }
    expect(summary).toContain("capture started: false");
    expect(summary).toContain("capture stopped: false");
    expect(summary).toContain("permission requested: false");
    expect(summary).toContain("tool execution: false");
  });
});
