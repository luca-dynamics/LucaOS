// visualCoreModeTransitionLabels — PR #146: VisualCore Mode Transition Trace
// Visibility. Diagnostics/UI visibility only.
//
// Pure helper functions for rendering VisualCore mode transition audit records
// (from PR #145) in the right-panel ActivityPanel and TraceLogsPanel.
//
// No service imports. No localStorage. No execution. No side effects.
// Nothing here changes mode transition policy or VisualCore behavior. It does
// NOT add automation, DOM reading, screenshot/OCR/vision, file access,
// messaging, wireless, or sensitive-mode execution — it only describes records.

import type {
  VisualCoreModeTransitionRecord,
  VisualCoreModeTransitionSource,
  VisualCoreModeTransitionStatus,
} from "../../types/visualCoreModeTransitions";

export type VisualCoreModeTransitionTone =
  | "good"
  | "warn"
  | "danger"
  | "neutral"
  | "info";

// ---------------------------------------------------------------------------
// Status labels and tones
// ---------------------------------------------------------------------------

export function getVisualCoreModeTransitionStatusLabel(
  status: VisualCoreModeTransitionStatus,
): string {
  switch (status) {
    case "allowed": return "Allowed";
    case "allowed_governed_browser": return "Allowed (governed browser)";
    case "blocked_sensitive": return "Blocked — sensitive mode";
    case "blocked_unknown": return "Blocked — unknown mode";
    case "blocked_browser_no_session": return "Blocked — no browser session";
  }
}

export function getVisualCoreModeTransitionStatusTone(
  status: VisualCoreModeTransitionStatus,
): VisualCoreModeTransitionTone {
  switch (status) {
    case "allowed": return "good";
    case "allowed_governed_browser": return "info";
    case "blocked_sensitive": return "danger";
    case "blocked_unknown": return "danger";
    case "blocked_browser_no_session": return "warn";
  }
}

/** Whether a transition status represents a blocked (non-actionable) outcome. */
export function isVisualCoreModeTransitionBlocked(
  status: VisualCoreModeTransitionStatus,
): boolean {
  return status.startsWith("blocked");
}

// ---------------------------------------------------------------------------
// Source labels
// ---------------------------------------------------------------------------

export function getVisualCoreModeTransitionSourceLabel(
  source: VisualCoreModeTransitionSource,
): string {
  switch (source) {
    case "local_ui": return "Local UI";
    case "prop_update": return "Prop update";
    case "remote_command": return "Remote command";
    case "browser_close": return "Browser close";
    case "browser_revoke": return "Browser revoke";
    case "display_session": return "Display session";
    case "component_close": return "Component close";
    case "system": return "System";
  }
}

// ---------------------------------------------------------------------------
// Boundary labels — what mode transition visibility does NOT do.
// ---------------------------------------------------------------------------

/** Fixed boundary labels describing what mode-transition visibility does NOT do. */
export function getVisualCoreModeTransitionBoundaryLabels(): string[] {
  return [
    "Mode transition audit only",
    "No transition policy change",
    "No capture",
    "No automation",
    "No DOM read",
    "No click/type/scroll",
    "No screenshot/OCR/vision",
    "No external action",
    "No file access",
    "No messaging",
    "No wireless/device control",
    "No approve/run/execute",
  ];
}

// ---------------------------------------------------------------------------
// Safety flag summary — compact chips proving every capability stays disabled.
// ---------------------------------------------------------------------------

/**
 * Compact summary of a record's hard safety flags for display. Reads the flags
 * directly off the record so the UI mirrors the audited values rather than
 * hard-coding them. Every danger flag is expected to be false.
 */
export function getVisualCoreModeTransitionSafetyFlagSummary(
  record: VisualCoreModeTransitionRecord,
): string[] {
  return [
    `execution changed: ${record.executionChanged}`,
    `capture: ${record.captureEnabled}`,
    `automation: ${record.automationEnabled}`,
    `external action: ${record.externalActionEnabled}`,
    `file: ${record.fileAccessEnabled}`,
    `messaging: ${record.messagingEnabled}`,
    `wireless: ${record.wirelessControlEnabled}`,
    `wallet/payment: ${record.walletPaymentEnabled}`,
  ];
}
