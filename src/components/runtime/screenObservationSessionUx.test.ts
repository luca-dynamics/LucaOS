import { describe, expect, it } from "vitest";
import type {
  ScreenObservationPolicyDecision,
  ScreenObservationRequestRecord,
  ScreenObservationSessionRecord,
  ScreenObservationSessionStatus,
} from "../../types/screenObservation";
import {
  getObservationRequestTimeline,
  getObservationSessionBoundaryCopy,
  getObservationSessionConsentCopy,
  getObservationSessionCredentialBoundaryCopy,
  getObservationSessionLifecycleLabel,
  getObservationSessionNoCaptureBadge,
  getObservationSessionRevocationCopy,
  getObservationSessionSensitiveContentCopy,
  getObservationSessionTimeline,
  getObservationSessionVisibleIndicatorCopy,
} from "./screenObservationSessionUx";

const policyDecision: ScreenObservationPolicyDecision = {
  allowedForCapture: false,
  allowedForVisionModel: false,
  allowedForDryRun: true,
  riskLevel: "elevated",
  surface: "full_screen",
  capability: "observe_static_context",
  blockedBy: [],
  userSafeReason: "Dry-run only.",
  requiresExplicitConsent: true,
  requiresVisibleIndicator: true,
  requiresRegionBoundary: true,
  requiresSensitiveContentFilter: true,
  requiresCredentialBoundary: true,
  requiresHumanConfirmation: true,
  requiresAuditLog: true,
  revocable: true,
};

function makeSession(status: ScreenObservationSessionStatus): ScreenObservationSessionRecord {
  return {
    observationSessionId: `screen-observation-session:${status}`,
    requestId: "screen-observation:req",
    title: "Observe screen",
    summary: "Dry-run permission session",
    surface: "full_screen",
    capability: "observe_static_context",
    status,
    consentState: status === "waiting_consent" ? "required" : "granted_dry_run_only",
    riskLevel: "elevated",
    revokedAt: status === "revoked" ? new Date().toISOString() : undefined,
    policyDecision,
    provenanceIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metadata: {},
  };
}

const request: ScreenObservationRequestRecord = {
  observationRequestId: "screen-observation:req",
  title: "Observe screen",
  summary: "Dry-run permission request",
  source: "test",
  surface: "full_screen",
  capability: "observe_static_context",
  status: "consent_required",
  riskLevel: "elevated",
  consentState: "required",
  policyDecision,
  provenanceIds: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  metadata: {},
};

describe("screenObservationSessionUx", () => {
  it("dry-run session label says dry-run permission only", () => {
    expect(getObservationSessionLifecycleLabel(makeSession("dry_run_only")).toLowerCase()).toContain("dry-run permission session only");
  });

  it("waiting-consent session says consent modeled / not activated", () => {
    const label = getObservationSessionLifecycleLabel(makeSession("waiting_consent")).toLowerCase();
    expect(label).toContain("consent modeled");
    expect(label).toContain("not activated");
  });

  it("revoked session says revoked and no observation occurred", () => {
    const label = getObservationSessionLifecycleLabel(makeSession("revoked")).toLowerCase();
    expect(label).toContain("revoked");
    expect(label).toContain("no observation");
  });

  it("no-capture badge says capture disabled and vision disabled", () => {
    const badge = getObservationSessionNoCaptureBadge().toLowerCase();
    expect(badge).toContain("capture disabled");
    expect(badge).toContain("vision model disabled");
  });

  it("visible indicator copy describes a future requirement only", () => {
    const copy = getObservationSessionVisibleIndicatorCopy().toLowerCase();
    expect(copy).toContain("visible indicator");
    expect(copy).toContain("future requirement only");
  });

  it("region boundary copy describes a future requirement only", () => {
    const copy = getObservationSessionBoundaryCopy().toLowerCase();
    expect(copy).toContain("region boundary");
    expect(copy).toContain("future requirement only");
  });

  it("sensitive content copy describes a future requirement only", () => {
    const copy = getObservationSessionSensitiveContentCopy().toLowerCase();
    expect(copy).toContain("sensitive content");
    expect(copy).toContain("future requirement only");
  });

  it("credential boundary copy says credentials never captured or stored", () => {
    expect(getObservationSessionCredentialBoundaryCopy().toLowerCase()).toContain("credentials are never captured or stored");
  });

  it("consent copy says consent modeled, not activated for required consent", () => {
    const copy = getObservationSessionConsentCopy(makeSession("waiting_consent")).toLowerCase();
    expect(copy).toContain("consent modeled, not activated");
  });

  it("revocation copy says revocable at any time for active sessions", () => {
    expect(getObservationSessionRevocationCopy(makeSession("dry_run_only")).toLowerCase()).toContain("revocable at any time");
  });

  it("timelines never say start/started capture or observation", () => {
    const statuses: ScreenObservationSessionStatus[] = [
      "proposed", "waiting_consent", "dry_run_only", "blocked", "revoked", "expired", "archived",
    ];
    for (const status of statuses) {
      for (const step of getObservationSessionTimeline(makeSession(status))) {
        expect(step.label.toLowerCase()).not.toContain("start");
        expect(step.label.toLowerCase()).not.toContain("capture");
      }
    }
    for (const step of getObservationRequestTimeline(request)) {
      expect(step.label.toLowerCase()).not.toContain("start");
      expect(step.label.toLowerCase()).not.toContain("capture");
    }
  });

  it("request timeline starts with requested and dry-run modeled", () => {
    const timeline = getObservationRequestTimeline(request);
    expect(timeline[0].key).toBe("requested");
    expect(timeline[1].key).toBe("dry_run_modeled");
    expect(timeline.some((step) => step.key === "consent_required")).toBe(true);
  });
});
