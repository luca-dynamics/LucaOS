// VisualCore display session types — PR #141: VisualCore Governed Display
// Session Records.
//
// This is the *display-only* governance model for low-risk VisualCore surfaces
// (the modes PR #140 classified as `ready_for_display_governance`). A display
// session record is an audit/lifecycle record of a low-risk display surface
// being shown — nothing more.
//
// Hard guarantees — these types and the systems built on them NEVER:
//   - govern, wrap, or gate sensitive VisualCore modes
//   - change VisualCore behavior, mode switching, or IPC behavior
//   - open/close VisualCore from a service
//   - execute any external action
//   - capture screen / camera / audio, read files, or use OCR/vision
//   - touch messaging / wireless / browser / code / finance sensitive modes
//
// Every safety capability flag below is hard-`false`. `governanceApplied` and
// `displayOnly` are hard-`true`. These records are display-session audit only.

import type {
  VisualCoreGovernanceReadiness,
  VisualCoreSurfaceMode,
  VisualCoreSurfaceRiskLevel,
} from "./visualCoreGovernance";

export type VisualCoreDisplaySessionStatus =
  | "open_requested"
  | "open"
  | "paused"
  | "closed"
  | "revoked"
  | "blocked";

/** Where the display session record originated. */
export type VisualCoreDisplaySessionSource =
  | "prop_update"
  | "visual_data"
  | "user_tab"
  | "system"
  | "ipc_remote_control";

export interface VisualCoreDisplaySessionRecord {
  visualSessionId: string;
  mode: VisualCoreSurfaceMode;
  status: VisualCoreDisplaySessionStatus;
  label: string;
  riskLevel: VisualCoreSurfaceRiskLevel;
  readiness: VisualCoreGovernanceReadiness;
  source: VisualCoreDisplaySessionSource;
  openedAt: string;
  updatedAt: string;
  closedAt?: string;
  revokedAt?: string;
  blockedBy?: string[];
  userSafeReason: string;
  /**
   * PR #147 — audit-safe correlation/trace ID linking this display session to
   * the mode transition / remote command that created it. Opaque, never
   * derived from URLs, tokens, hashes, or sensitive values.
   */
  correlationId?: string;
  metadata?: Record<string, unknown>;
  // Hard guarantees — display-only governance, every capability disabled.
  governanceApplied: true;
  displayOnly: true;
  captureEnabled: false;
  automationEnabled: false;
  externalActionEnabled: false;
  credentialSensitive: false;
  walletPaymentEnabled: false;
  fileAccessEnabled: false;
  messagingEnabled: false;
  wirelessControlEnabled: false;
}

export interface VisualCoreDisplaySessionDiagnosticsSummary {
  totalSessions: number;
  openRequestedSessions: number;
  openSessions: number;
  pausedSessions: number;
  closedSessions: number;
  revokedSessions: number;
  blockedSessions: number;
  lastSessionAt: string | null;
  /** Count of PR #140 modes ready for display governance. */
  readyDisplayModeCount: number;
  /** Count of PR #140 sensitive modes (still ungoverned). */
  sensitiveModeCount: number;
  // Display-session governance posture — fixed, never toggled here.
  governanceApplied: true;
  displayOnly: true;
  captureEnabled: false;
  automationEnabled: false;
  externalActionEnabled: false;
  fileAccessEnabled: false;
  messagingEnabled: false;
  wirelessControlEnabled: false;
  walletPaymentEnabled: false;
}

/** eventBus + trace channel for display session lifecycle events. */
export const VISUAL_CORE_DISPLAY_SESSION_EVENT = "visual_core_display_session";

/** Maximum number of display session records retained. */
export const MAX_VISUAL_CORE_DISPLAY_SESSIONS = 100;

/** All display session statuses. */
export const VISUAL_CORE_DISPLAY_SESSION_STATUSES: VisualCoreDisplaySessionStatus[] =
  ["open_requested", "open", "paused", "closed", "revoked", "blocked"];

/** All allowed display session sources. */
export const VISUAL_CORE_DISPLAY_SESSION_SOURCES: VisualCoreDisplaySessionSource[] =
  ["prop_update", "visual_data", "user_tab", "system", "ipc_remote_control"];
