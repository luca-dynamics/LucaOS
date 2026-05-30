// VisualCore mode transition types — PR #145: VisualCore Governed Mode
// Transition Guard.
//
// Audit/governance types for VisualCore mode transitions. A transition record
// captures every mode switch attempt, its policy outcome, and source.
//
// Hard guarantees — these types and the systems built on them NEVER:
//   - change VisualCore behavior beyond auditing/gating mode transitions
//   - enable capture / screenshot / OCR / vision / file / messaging / wireless
//   - add browser automation, click/type/scroll, DOM reading
//   - enable sensitive VisualCore modes
//   - execute any external action

import type { VisualCoreSurfaceMode } from "./visualCoreGovernance";

/** Outcome of a mode transition evaluation. */
export type VisualCoreModeTransitionStatus =
  | "allowed"
  | "allowed_governed_browser"
  | "blocked_sensitive"
  | "blocked_unknown"
  | "blocked_browser_no_session";

/** Where the mode transition request originated. */
export type VisualCoreModeTransitionSource =
  | "local_ui"
  | "prop_update"
  | "remote_command"
  | "browser_close"
  | "browser_revoke"
  | "display_session"
  | "component_close"
  | "system";

/** Policy decision for a single mode transition attempt. */
export interface VisualCoreModeTransitionDecision {
  fromMode: string;
  toMode: string;
  status: VisualCoreModeTransitionStatus;
  source: VisualCoreModeTransitionSource;
  /** User-safe reason string explaining the decision. */
  userSafeReason: string;
  /** Governance reasons the transition was blocked, if any. */
  blockedBy?: string[];
}

/** Audit record for a single mode transition attempt. */
export interface VisualCoreModeTransitionRecord {
  transitionId: string;
  fromMode: string;
  toMode: string;
  status: VisualCoreModeTransitionStatus;
  source: VisualCoreModeTransitionSource;
  userSafeReason: string;
  blockedBy?: string[];
  timestamp: string;
  /**
   * PR #147 — audit-safe correlation/trace ID linking this transition to the
   * remote command / display session it belongs to. Opaque, never derived
   * from URLs, tokens, hashes, or sensitive values.
   */
  correlationId?: string;
  /**
   * PR #147 — safe local reference to the governed LucaBrowser shell session
   * for BROWSER transitions. A local opaque session ID only — never a URL,
   * token, hash, DOM, screenshot, or page content.
   */
  browserShellSessionId?: string;
  // Hard safety flags — every capability disabled.
  governanceApplied: true;
  transitionOnly: true;
  executionChanged: false;
  captureEnabled: false;
  automationEnabled: false;
  externalActionEnabled: false;
  fileAccessEnabled: false;
  messagingEnabled: false;
  wirelessControlEnabled: false;
  walletPaymentEnabled: false;
}

/** Aggregate diagnostics for mode transitions. */
export interface VisualCoreModeTransitionDiagnosticsSummary {
  totalTransitions: number;
  allowedTransitions: number;
  allowedGovernedBrowserTransitions: number;
  blockedSensitiveTransitions: number;
  blockedUnknownTransitions: number;
  blockedBrowserNoSessionTransitions: number;
  lastTransitionAt: string | null;
  // Hard safety flags.
  governanceApplied: true;
  transitionOnly: true;
  executionChanged: false;
  captureEnabled: false;
  automationEnabled: false;
  externalActionEnabled: false;
  fileAccessEnabled: false;
  messagingEnabled: false;
  wirelessControlEnabled: false;
  walletPaymentEnabled: false;
}

/** Maximum bounded transition records stored. */
export const MAX_VISUAL_CORE_MODE_TRANSITION_RECORDS = 100;

/** eventBus channel for mode transition audit events. */
export const VISUAL_CORE_MODE_TRANSITION_EVENT = "visual_core_mode_transition";

/** All known VisualCore modes as a set for validation. */
export const VISUAL_CORE_KNOWN_MODES: ReadonlySet<string> = new Set<string>([
  "IDLE", "BROWSER", "DATA", "CINEMA", "DATA_ROOM", "SECURITY",
  "SOVEREIGNTY", "OSINT", "STOCKS", "AUTONOMY", "SUBSYSTEMS",
  "CODE_EDITOR", "SKILLS", "CRYPTO", "FOREX", "PREDICTIONS",
  "NETWORK", "HACKING", "REPORTS", "GEO", "LIVE", "FILES",
  "VISION", "RECORDER", "TELEGRAM", "WHATSAPP", "WIRELESS",
  "INGESTION", "TACTICAL",
]);
