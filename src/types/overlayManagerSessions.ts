// OverlayManager session record types — PR #149: OverlayManager Governed
// Overlay Session Records.
//
// This is the *record-only* governance model for the low-risk display-only
// overlay surfaces PR #148 classified (`display-only`, `riskLevel: "low"`,
// not `sensitive` / `needs-governance` / `blocked-until-policy`). An overlay
// session record is an audit/lifecycle record of a low-risk display surface
// being shown — nothing more. It mirrors the VisualCore display session record
// pattern from PR #141 (src/types/visualCoreSessions.ts).
//
// Hard guarantees — these types and the systems built on them NEVER:
//   - govern, wrap, or gate sensitive overlay surfaces (VoiceHud, SecurityGate,
//     capture surfaces, OriginOverlayPanels, Android native overlay, etc.) —
//     those are recorded as `blocked` only, never `open`
//   - change OverlayManager runtime behavior, show/hide logic, z-index, focus,
//     or pointer-events behavior
//   - add/remove overlays or open/close an overlay from a service
//   - execute any external action, automation, click/type/scroll, DOM reading,
//     screenshot / OCR / vision, file access, messaging, wireless/device
//     control, tool execution, or wallet/payment
//
// Every safety capability flag below is hard-`false`. `governanceApplied` and
// `recordOnly` are hard-`true`. These records are overlay-session audit only.

import type {
  OverlayPosture,
  OverlaySurfaceId,
  OverlaySurfaceRiskLevel,
} from "./overlayManagerGovernance";

/** Lifecycle status of an overlay session record. */
export type OverlaySessionStatus =
  | "open_requested"
  | "open"
  | "closed"
  | "blocked";

/** Where the overlay session record originated. */
export type OverlaySessionSource =
  | "prop_toggle"
  | "app_state"
  | "system"
  | "user_action";

/**
 * Fixed record-only safety posture applied to every overlay session record and
 * diagnostics summary. None of these are ever toggled by this layer.
 */
export interface OverlaySessionSafetyFlags {
  governanceApplied: true;
  recordOnly: true;
  executionChanged: false;
  captureEnabled: false;
  automationEnabled: false;
  externalActionEnabled: false;
  fileAccessEnabled: false;
  messagingEnabled: false;
  wirelessControlEnabled: false;
  walletPaymentEnabled: false;
  sensitiveSurfaceEnabled: false;
}

export interface OverlaySessionRecord extends OverlaySessionSafetyFlags {
  overlaySessionId: string;
  overlaySurfaceId: OverlaySurfaceId;
  status: OverlaySessionStatus;
  source: OverlaySessionSource;
  label: string;
  riskLevel: OverlaySurfaceRiskLevel;
  postures: OverlayPosture[];
  openedAt: string;
  updatedAt: string;
  closedAt?: string;
  userSafeReason: string;
  /** Populated when a surface was ineligible/sensitive and recorded as blocked. */
  blockedBy?: string[];
  metadata?: Record<string, unknown>;
}

export interface OverlaySessionDiagnosticsSummary extends OverlaySessionSafetyFlags {
  totalSessions: number;
  openRequestedSessions: number;
  openSessions: number;
  closedSessions: number;
  /** Blocked/ignored attempts (ineligible or sensitive surfaces). */
  blockedSessions: number;
  lastSessionAt: string | null;
  /** Count of PR #148 surfaces eligible for record-only governance today. */
  eligibleSurfaceCount: number;
  /** Count of PR #148 sensitive surfaces (still ungoverned). */
  sensitiveSurfaceCount: number;
}

/** eventBus + trace channel for overlay session lifecycle events. */
export const OVERLAY_SESSION_EVENT = "overlay_manager_session";

/** Maximum number of overlay session records retained. */
export const MAX_OVERLAY_SESSIONS = 100;

/** All overlay session statuses. */
export const OVERLAY_SESSION_STATUSES: OverlaySessionStatus[] = [
  "open_requested",
  "open",
  "closed",
  "blocked",
];

/** All allowed overlay session sources. */
export const OVERLAY_SESSION_SOURCES: OverlaySessionSource[] = [
  "prop_toggle",
  "app_state",
  "system",
  "user_action",
];
