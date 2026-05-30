// Screen Observation Permission Model — PR #131: dry-run / permission-model only.
// These records describe how a future screen observation request/session would be
// permissioned. Nothing here captures, views, stores, OCRs, or analyzes a screen.
//
// Hard guarantees encoded by these types:
//   - allowedForCapture is always false.
//   - allowedForVisionModel is always false.
//   - No screenshot/image data, OCR text, DOM content, file contents, or
//     credentials/tokens/passwords/session cookies are ever stored on a record.

export type ScreenObservationSurface =
  | "full_screen"
  | "window"
  | "app"
  | "browser_tab"
  | "region"
  | "unknown";

export type ScreenObservationCapability =
  | "observe_static_context"
  | "observe_live_context"
  | "detect_ui_layout"
  | "detect_text_presence"
  | "detect_sensitive_presence"
  | "unknown";

export type ScreenObservationRequestStatus =
  | "proposed"
  | "dry_run_only"
  | "blocked"
  | "consent_required"
  | "revoked"
  | "archived";

export type ScreenObservationSessionStatus =
  | "proposed"
  | "waiting_consent"
  | "dry_run_only"
  | "blocked"
  | "revoked"
  | "expired"
  | "archived";

export type ScreenObservationRiskLevel = "low" | "elevated" | "high" | "critical";

export type ScreenObservationConsentState =
  | "not_requested"
  | "required"
  | "granted_dry_run_only"
  | "denied"
  | "revoked"
  | "expired";

export interface ScreenObservationPolicyDecision {
  allowedForCapture: false;
  allowedForVisionModel: false;
  allowedForDryRun: boolean;
  riskLevel: ScreenObservationRiskLevel;
  surface: ScreenObservationSurface;
  capability: ScreenObservationCapability;
  blockedBy: string[];
  userSafeReason: string;
  requiresExplicitConsent: boolean;
  requiresVisibleIndicator: boolean;
  requiresRegionBoundary: boolean;
  requiresSensitiveContentFilter: boolean;
  requiresCredentialBoundary: boolean;
  requiresHumanConfirmation: boolean;
  requiresAuditLog: boolean;
  revocable: true;
}

export interface ScreenObservationRequestRecord {
  observationRequestId: string;
  title: string;
  summary: string;
  source: string;
  sourceId?: string;
  surface: ScreenObservationSurface;
  capability: ScreenObservationCapability;
  targetDescriptor?: string;
  status: ScreenObservationRequestStatus;
  riskLevel: ScreenObservationRiskLevel;
  consentState: ScreenObservationConsentState;
  policyDecision: ScreenObservationPolicyDecision;
  provenanceIds: string[];
  createdAt: string;
  updatedAt: string;
  blockedBy?: string[];
  metadata: Record<string, unknown>;
}

export interface ScreenObservationSessionRecord {
  observationSessionId: string;
  requestId?: string;
  title: string;
  summary: string;
  surface: ScreenObservationSurface;
  capability: ScreenObservationCapability;
  targetDescriptor?: string;
  status: ScreenObservationSessionStatus;
  consentState: ScreenObservationConsentState;
  riskLevel: ScreenObservationRiskLevel;
  startedAt?: string;
  endedAt?: string;
  revokedAt?: string;
  policyDecision: ScreenObservationPolicyDecision;
  provenanceIds: string[];
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface ScreenObservationDiagnosticsSummary {
  totalRequests: number;
  dryRunRequests: number;
  blockedRequests: number;
  consentRequiredRequests: number;
  totalSessions: number;
  dryRunSessions: number;
  revokedSessions: number;
  captureEnabled: false;
  visionModelEnabled: false;
  dryRunOnly: true;
  lastRequestAt?: string;
}
