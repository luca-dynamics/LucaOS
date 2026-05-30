// screenObservationLabels — PR #131: Screen Observation Permission Model, dry-run only.
// Pure helper functions for screen observation labels, tones, safeguard checklists,
// and no-capture / future-readiness copy.
//
// No service imports. No localStorage. No execution. No side effects.
// Nothing here enables screen capture, vision analysis, OCR, or DOM reading.

import type {
  ScreenObservationCapability,
  ScreenObservationConsentState,
  ScreenObservationPolicyDecision,
  ScreenObservationRequestRecord,
  ScreenObservationRequestStatus,
  ScreenObservationRiskLevel,
  ScreenObservationSessionRecord,
  ScreenObservationSessionStatus,
  ScreenObservationSurface,
} from "../../types/screenObservation";

export type ScreenObservationTone = "good" | "warn" | "danger" | "neutral" | "info";

export type ScreenObservationStatus = ScreenObservationRequestStatus | ScreenObservationSessionStatus;

type ScreenObservationRecord = ScreenObservationRequestRecord | ScreenObservationSessionRecord;

// ---------------------------------------------------------------------------
// Surface labels
// ---------------------------------------------------------------------------

export function getScreenObservationSurfaceLabel(surface: ScreenObservationSurface): string {
  switch (surface) {
    case "full_screen": return "Full screen";
    case "window": return "Window";
    case "app": return "App";
    case "browser_tab": return "Browser tab";
    case "region": return "Region";
    case "unknown": return "Unknown surface";
  }
}

// ---------------------------------------------------------------------------
// Capability labels
// ---------------------------------------------------------------------------

export function getScreenObservationCapabilityLabel(capability: ScreenObservationCapability): string {
  switch (capability) {
    case "observe_static_context": return "Observe static context";
    case "observe_live_context": return "Observe live context";
    case "detect_ui_layout": return "Detect UI layout";
    case "detect_text_presence": return "Detect text presence (OCR disabled)";
    case "detect_sensitive_presence": return "Detect sensitive-content presence";
    case "unknown": return "Unknown capability";
  }
}

// ---------------------------------------------------------------------------
// Status labels and tones
// ---------------------------------------------------------------------------

export function getScreenObservationStatusLabel(status: ScreenObservationStatus): string {
  switch (status) {
    case "proposed": return "Proposed";
    case "dry_run_only": return "Dry-run only";
    case "blocked": return "Blocked for safety";
    case "consent_required": return "Consent required";
    case "waiting_consent": return "Waiting for consent";
    case "revoked": return "Revoked";
    case "expired": return "Expired";
    case "archived": return "Archived";
  }
}

export function getScreenObservationStatusTone(status: ScreenObservationStatus): ScreenObservationTone {
  switch (status) {
    case "proposed": return "info";
    case "dry_run_only": return "warn";
    case "blocked": return "danger";
    case "consent_required": return "warn";
    case "waiting_consent": return "warn";
    case "revoked": return "neutral";
    case "expired": return "neutral";
    case "archived": return "neutral";
  }
}

// ---------------------------------------------------------------------------
// Risk labels
// ---------------------------------------------------------------------------

export function getScreenObservationRiskLabel(riskLevel: ScreenObservationRiskLevel): string {
  switch (riskLevel) {
    case "low": return "Low risk";
    case "elevated": return "Elevated risk";
    case "high": return "High risk";
    case "critical": return "Critical risk";
  }
}

// ---------------------------------------------------------------------------
// Consent labels
// ---------------------------------------------------------------------------

export function getScreenObservationConsentLabel(consentState: ScreenObservationConsentState): string {
  switch (consentState) {
    case "not_requested": return "Consent not requested";
    case "required": return "Consent required";
    case "granted_dry_run_only": return "Consent granted (dry-run only)";
    case "denied": return "Consent denied";
    case "revoked": return "Consent revoked";
    case "expired": return "Consent expired";
  }
}

// ---------------------------------------------------------------------------
// Safeguard checklist
// ---------------------------------------------------------------------------

export interface ScreenObservationSafeguardLabel {
  key:
    | "requiresExplicitConsent"
    | "requiresVisibleIndicator"
    | "requiresRegionBoundary"
    | "requiresSensitiveContentFilter"
    | "requiresCredentialBoundary"
    | "requiresHumanConfirmation"
    | "requiresAuditLog"
    | "revocable";
  label: string;
  required: boolean;
}

export function getScreenObservationSafeguardLabels(
  policyDecision: ScreenObservationPolicyDecision,
): ScreenObservationSafeguardLabel[] {
  return [
    { key: "requiresExplicitConsent", label: "Explicit consent required", required: policyDecision.requiresExplicitConsent },
    { key: "requiresVisibleIndicator", label: "Visible indicator required", required: policyDecision.requiresVisibleIndicator },
    { key: "requiresRegionBoundary", label: "Region boundary required", required: policyDecision.requiresRegionBoundary },
    { key: "requiresSensitiveContentFilter", label: "Sensitive-content filter required", required: policyDecision.requiresSensitiveContentFilter },
    { key: "requiresCredentialBoundary", label: "Credential boundary required", required: policyDecision.requiresCredentialBoundary },
    { key: "requiresHumanConfirmation", label: "Human confirmation required", required: policyDecision.requiresHumanConfirmation },
    { key: "requiresAuditLog", label: "Audit log required", required: policyDecision.requiresAuditLog },
    { key: "revocable", label: "Revocable", required: policyDecision.revocable },
  ];
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export function getScreenObservationSummary(record: ScreenObservationRecord): string {
  const surface = getScreenObservationSurfaceLabel(record.surface);
  const capability = getScreenObservationCapabilityLabel(record.capability);
  const status = getScreenObservationStatusLabel(record.status);
  return `${surface} · ${capability} · ${status}`;
}

// ---------------------------------------------------------------------------
// Next action (what the user can do — capture is never available)
// ---------------------------------------------------------------------------

export function getScreenObservationNextAction(record: ScreenObservationRecord): string {
  switch (record.status) {
    case "blocked":
      return "Archive or review only — screen capture and vision analysis remain disabled.";
    case "consent_required":
      return "Consent would be required before any future observation. No capture is available now.";
    case "waiting_consent":
      return "Awaiting consent — dry-run permission session only. No capture is available.";
    case "dry_run_only":
      return "Create a dry-run permission session or archive — no capture, OCR, or analysis happens.";
    case "revoked":
      return "No action needed — observation permission was revoked.";
    case "expired":
      return "No action needed — observation permission expired.";
    case "proposed":
      return "No action available — screen capture and vision analysis remain disabled.";
    case "archived":
      return "No action needed — record archived.";
  }
}

// ---------------------------------------------------------------------------
// No-capture copy
// ---------------------------------------------------------------------------

export function getScreenObservationNoCaptureText(): string {
  return "Dry-run only — Luca cannot capture, view, store, OCR, or analyze your screen. No screenshots, pixels, DOM, OCR text, or credentials are ever captured or stored.";
}

// ---------------------------------------------------------------------------
// Future-readiness copy (per-record)
// ---------------------------------------------------------------------------

export function getScreenObservationFutureReadinessText(record: ScreenObservationRecord): string {
  if (record.status === "blocked") {
    return "Future readiness: not eligible — blocked by screen observation policy.";
  }
  if (record.status === "revoked" || record.status === "expired" || record.status === "archived") {
    return "Future readiness: not applicable — record is revoked, expired, or archived.";
  }
  const surface = getScreenObservationSurfaceLabel(record.surface).toLowerCase();
  return `Future readiness: observing the ${surface} would require explicit consent, a visible indicator, a region boundary, sensitive-content filtering, a credential boundary, human confirmation, audit logging, and remain revocable before any capture could be considered.`;
}
