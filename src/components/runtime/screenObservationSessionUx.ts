// screenObservationSessionUx — PR #132: Vision Observation Session UX, still no capture.
// Pure helper functions that turn screen observation request/session records into
// user-facing lifecycle, consent, boundary, and timeline copy.
//
// No service imports. No localStorage. No execution. No side effects.
// Nothing here enables screen capture, vision analysis, OCR, or DOM reading.
// "Visible indicator", "region boundary", and "sensitive-content filter" are
// described as FUTURE requirements only — never enabled features.

import type {
  ScreenObservationConsentState,
  ScreenObservationRequestRecord,
  ScreenObservationSessionRecord,
} from "../../types/screenObservation";
import type { ScreenObservationTone } from "./screenObservationLabels";

// ---------------------------------------------------------------------------
// Timeline step model (consumed by panels; panels format `at` themselves)
// ---------------------------------------------------------------------------

export interface ObservationTimelineStep {
  key: string;
  label: string;
  at?: string;
  state: "done" | "current" | "pending";
}

// ---------------------------------------------------------------------------
// Session lifecycle label + tone
// ---------------------------------------------------------------------------

export function getObservationSessionLifecycleLabel(session: ScreenObservationSessionRecord): string {
  switch (session.status) {
    case "proposed": return "Proposed permission session — no observation";
    case "waiting_consent": return "Waiting for consent — consent modeled, not activated";
    case "dry_run_only": return "Dry-run permission session only — no capture";
    case "blocked": return "Blocked for safety — no observation";
    case "revoked": return "Revoked — no observation occurred";
    case "expired": return "Expired — no observation occurred";
    case "archived": return "Archived — no observation occurred";
  }
}

export function getObservationSessionLifecycleTone(session: ScreenObservationSessionRecord): ScreenObservationTone {
  switch (session.status) {
    case "proposed": return "info";
    case "waiting_consent": return "warn";
    case "dry_run_only": return "warn";
    case "blocked": return "danger";
    case "revoked": return "neutral";
    case "expired": return "neutral";
    case "archived": return "neutral";
  }
}

// ---------------------------------------------------------------------------
// Consent / boundary / revocation copy (all describe future requirements only)
// ---------------------------------------------------------------------------

export function getObservationSessionConsentCopy(session: ScreenObservationSessionRecord): string {
  return consentCopy(session.consentState);
}

function consentCopy(consentState: ScreenObservationConsentState): string {
  switch (consentState) {
    case "not_requested": return "Consent not requested — consent modeled, not activated. No screen is captured.";
    case "required": return "Consent required — consent modeled, not activated. No screen is captured.";
    case "granted_dry_run_only": return "Consent granted for dry-run modeling only — no capture is enabled.";
    case "denied": return "Consent denied — no observation would occur.";
    case "revoked": return "Consent revoked — no observation occurred.";
    case "expired": return "Consent expired — no observation occurred.";
  }
}

export function getObservationSessionBoundaryCopy(): string {
  return "Region boundary would be required before any future observation. This is a future requirement only — no region is read today.";
}

export function getObservationSessionRevocationCopy(session: ScreenObservationSessionRecord): string {
  if (session.status === "revoked") {
    return "Revoked — permission modeling ended. No observation ever occurred and nothing was captured.";
  }
  return "Revocable at any time. Revoking ends permission modeling only — no observation ever occurs.";
}

export function getObservationSessionVisibleIndicatorCopy(): string {
  return "A visible indicator would be required before any future observation. This is a future requirement only — capture is disabled.";
}

export function getObservationSessionSensitiveContentCopy(): string {
  return "Sensitive content would have to be filtered before any future observation. This is a future requirement only — no screen content is read today.";
}

export function getObservationSessionCredentialBoundaryCopy(): string {
  return "Credentials are never captured or stored. Passwords, tokens, and session cookies stay outside any observation boundary.";
}

// ---------------------------------------------------------------------------
// No-capture / no-vision badge
// ---------------------------------------------------------------------------

export function getObservationSessionNoCaptureBadge(): string {
  return "Capture disabled · Vision model disabled";
}

// ---------------------------------------------------------------------------
// Timelines (no step ever says "start"/"started" capture or observation)
// ---------------------------------------------------------------------------

export function getObservationRequestTimeline(request: ScreenObservationRequestRecord): ObservationTimelineStep[] {
  const steps: ObservationTimelineStep[] = [
    { key: "requested", label: "Requested", at: request.createdAt, state: "done" },
    { key: "dry_run_modeled", label: "Dry-run modeled", at: request.createdAt, state: "done" },
  ];
  switch (request.status) {
    case "blocked":
      steps.push({ key: "blocked", label: "Blocked for safety", at: request.updatedAt, state: "current" });
      break;
    case "consent_required":
      steps.push({ key: "consent_required", label: "Consent required (not activated)", at: request.updatedAt, state: "current" });
      break;
    case "dry_run_only":
      steps.push({ key: "dry_run_only", label: "Dry-run only — awaiting your choice", at: request.updatedAt, state: "current" });
      break;
    case "revoked":
      steps.push({ key: "revoked", label: "Revoked — no observation occurred", at: request.updatedAt, state: "done" });
      break;
    case "archived":
      steps.push({ key: "archived", label: "Archived", at: request.updatedAt, state: "done" });
      break;
    case "proposed":
      steps.push({ key: "proposed", label: "Proposed — no observation", at: request.updatedAt, state: "current" });
      break;
  }
  return steps;
}

export function getObservationSessionTimeline(session: ScreenObservationSessionRecord): ObservationTimelineStep[] {
  const steps: ObservationTimelineStep[] = [
    { key: "created", label: "Session created", at: session.createdAt, state: "done" },
    { key: "consent_modeled", label: "Consent modeled, not activated", at: session.createdAt, state: "done" },
  ];
  switch (session.status) {
    case "waiting_consent":
      steps.push({ key: "waiting_consent", label: "Waiting for consent", at: session.updatedAt, state: "current" });
      break;
    case "dry_run_only":
      steps.push({ key: "dry_run_only", label: "Dry-run permission session only", at: session.updatedAt, state: "current" });
      break;
    case "blocked":
      steps.push({ key: "blocked", label: "Blocked for safety", at: session.updatedAt, state: "current" });
      break;
    case "revoked":
      steps.push({ key: "revoked", label: "Revoked — no observation occurred", at: session.revokedAt ?? session.updatedAt, state: "done" });
      break;
    case "expired":
      steps.push({ key: "expired", label: "Expired — no observation occurred", at: session.updatedAt, state: "done" });
      break;
    case "archived":
      steps.push({ key: "archived", label: "Archived", at: session.updatedAt, state: "done" });
      break;
    case "proposed":
      steps.push({ key: "proposed", label: "Proposed — no observation", at: session.updatedAt, state: "current" });
      break;
  }
  return steps;
}
