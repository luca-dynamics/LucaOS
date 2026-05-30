import { describe, expect, it } from "vitest";
import {
  getScreenObservationCapabilityLabel,
  getScreenObservationConsentLabel,
  getScreenObservationNextAction,
  getScreenObservationNoCaptureText,
  getScreenObservationRiskLabel,
  getScreenObservationSafeguardLabels,
  getScreenObservationStatusLabel,
  getScreenObservationSummary,
  getScreenObservationSurfaceLabel,
} from "./screenObservationLabels";
import type {
  ScreenObservationPolicyDecision,
  ScreenObservationRequestRecord,
  ScreenObservationRequestStatus,
} from "../../types/screenObservation";

function makeDecision(): ScreenObservationPolicyDecision {
  return {
    allowedForCapture: false,
    allowedForVisionModel: false,
    allowedForDryRun: true,
    riskLevel: "elevated",
    surface: "full_screen",
    capability: "observe_static_context",
    blockedBy: [],
    userSafeReason: "dry-run only",
    requiresExplicitConsent: true,
    requiresVisibleIndicator: true,
    requiresRegionBoundary: true,
    requiresSensitiveContentFilter: true,
    requiresCredentialBoundary: true,
    requiresHumanConfirmation: true,
    requiresAuditLog: true,
    revocable: true,
  };
}

function makeRecord(status: ScreenObservationRequestStatus): ScreenObservationRequestRecord {
  return {
    observationRequestId: "screen-observation-request:test",
    title: "Observe screen",
    summary: "look at my screen",
    source: "test",
    surface: "full_screen",
    capability: "observe_static_context",
    status,
    riskLevel: "elevated",
    consentState: "granted_dry_run_only",
    policyDecision: makeDecision(),
    provenanceIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    metadata: {},
  };
}

describe("screenObservationLabels", () => {
  it("maps surface, capability, status, risk, and consent labels", () => {
    expect(getScreenObservationSurfaceLabel("full_screen")).toBe("Full screen");
    expect(getScreenObservationCapabilityLabel("observe_static_context")).toBe("Observe static context");
    expect(getScreenObservationStatusLabel("dry_run_only")).toBe("Dry-run only");
    expect(getScreenObservationStatusLabel("waiting_consent")).toBe("Waiting for consent");
    expect(getScreenObservationRiskLabel("high")).toBe("High risk");
    expect(getScreenObservationConsentLabel("granted_dry_run_only")).toBe("Consent granted (dry-run only)");
    expect(getScreenObservationSummary(makeRecord("dry_run_only"))).toContain("Full screen");
  });

  it("no-capture copy says no capture, view, store, OCR, or analyze", () => {
    const text = getScreenObservationNoCaptureText().toLowerCase();
    expect(text).toContain("capture");
    expect(text).toContain("view");
    expect(text).toContain("store");
    expect(text).toContain("ocr");
    expect(text).toContain("analyze");
  });

  it("never suggests starting capture as a next action", () => {
    const statuses: ScreenObservationRequestStatus[] = ["proposed", "dry_run_only", "blocked", "consent_required", "revoked", "archived"];
    for (const status of statuses) {
      expect(getScreenObservationNextAction(makeRecord(status)).toLowerCase()).not.toContain("start capture");
    }
  });

  it("includes the full safeguard checklist", () => {
    const keys = getScreenObservationSafeguardLabels(makeDecision()).map((entry) => entry.key);
    expect(keys).toEqual([
      "requiresExplicitConsent",
      "requiresVisibleIndicator",
      "requiresRegionBoundary",
      "requiresSensitiveContentFilter",
      "requiresCredentialBoundary",
      "requiresHumanConfirmation",
      "requiresAuditLog",
      "revocable",
    ]);
  });
});
