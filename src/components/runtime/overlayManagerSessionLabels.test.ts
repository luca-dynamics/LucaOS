import { describe, expect, it } from "vitest";
import {
  getOverlaySessionBoundaryLabels,
  getOverlaySessionPostureSummary,
  getOverlaySessionSafetyFlagSummary,
  getOverlaySessionSourceLabel,
  getOverlaySessionStatusLabel,
  getOverlaySessionStatusTone,
  isOverlaySessionBlocked,
} from "./overlayManagerSessionLabels";
import {
  OVERLAY_SESSION_SOURCES,
  OVERLAY_SESSION_STATUSES,
  type OverlaySessionRecord,
} from "../../types/overlayManagerSessions";

function makeRecord(
  overrides: Partial<OverlaySessionRecord> = {},
): OverlaySessionRecord {
  return {
    overlaySessionId: "overlay-session:test:abc123",
    overlaySurfaceId: "app_background",
    status: "open_requested",
    source: "prop_toggle",
    label: "AppBackground",
    riskLevel: "low",
    postures: ["display-only", "local-ui-only"],
    openedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    userSafeReason: "AppBackground is a low-risk display-only overlay — recorded for audit only.",
    governanceApplied: true,
    recordOnly: true,
    executionChanged: false,
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

describe("overlayManagerSessionLabels", () => {
  it("maps every status to a non-empty label and tone", () => {
    for (const status of OVERLAY_SESSION_STATUSES) {
      expect(getOverlaySessionStatusLabel(status)).toBeTruthy();
      expect(getOverlaySessionStatusTone(status)).toBeTruthy();
    }
  });

  it("maps every source to a non-empty label", () => {
    for (const source of OVERLAY_SESSION_SOURCES) {
      expect(getOverlaySessionSourceLabel(source)).toBeTruthy();
    }
  });

  it("marks only blocked records as blocked/non-actionable", () => {
    expect(isOverlaySessionBlocked("open_requested")).toBe(false);
    expect(isOverlaySessionBlocked("open")).toBe(false);
    expect(isOverlaySessionBlocked("closed")).toBe(false);
    expect(isOverlaySessionBlocked("blocked")).toBe(true);
    // The blocked label communicates non-actionability to the user.
    expect(getOverlaySessionStatusLabel("blocked").toLowerCase()).toContain("non-actionable");
    expect(getOverlaySessionStatusTone("blocked")).toBe("danger");
  });

  it("exposes fixed boundary labels asserting no behavior change or execution", () => {
    const labels = getOverlaySessionBoundaryLabels();
    expect(labels).toContain("Overlay session audit only");
    expect(labels).toContain("No OverlayManager behavior change");
    expect(labels).toContain("No sensitive overlay governance");
    expect(labels).toContain("No approve/run/execute/open/close");
    expect(labels).toContain("No automation");
    expect(labels).toContain("No screenshot/OCR/vision");
  });

  it("summarizes safety flags as all-false for an eligible record", () => {
    const summary = getOverlaySessionSafetyFlagSummary(makeRecord());
    for (const chip of summary) {
      expect(chip.endsWith("false")).toBe(true);
    }
    expect(summary).toContain("execution changed: false");
    expect(summary).toContain("automation: false");
    expect(summary).toContain("wallet/payment: false");
    expect(summary).toContain("sensitive surface: false");
  });

  it("keeps all danger flags false even for a blocked sensitive overlay record", () => {
    const record = makeRecord({
      overlaySurfaceId: "voice_hud",
      status: "blocked",
      source: "app_state",
      label: "VoiceHud",
      riskLevel: "high",
      postures: ["sensitive-surface", "needs-governance"],
      userSafeReason: "VoiceHud is not a low-risk display-only overlay — recorded as blocked.",
      blockedBy: ["not_display_only_eligible:high"],
    });
    expect(isOverlaySessionBlocked(record.status)).toBe(true);
    const summary = getOverlaySessionSafetyFlagSummary(record);
    for (const chip of summary) {
      expect(chip.endsWith("false")).toBe(true);
    }
    expect(record.executionChanged).toBe(false);
    expect(record.automationEnabled).toBe(false);
    expect(record.captureEnabled).toBe(false);
    expect(record.sensitiveSurfaceEnabled).toBe(false);
  });

  it("summarizes postures, falling back when none are present", () => {
    expect(getOverlaySessionPostureSummary(makeRecord())).toContain("display-only");
    expect(getOverlaySessionPostureSummary(makeRecord({ postures: [] }))).toBe("unclassified");
  });
});
