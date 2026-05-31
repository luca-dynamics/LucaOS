// overlayManagerSessionLabels — PR #150: OverlayManager Session Trace
// Visibility. Diagnostics/UI visibility only.
//
// Pure helper functions for rendering OverlayManager overlay session records
// (from PR #149) in the right-panel ActivityPanel and TraceLogsPanel.
//
// No service imports. No localStorage. No execution. No side effects.
// Nothing here changes OverlayManager behavior, overlay show/hide, z-index,
// focus, or pointer-events. It does NOT add automation, click/type/scroll,
// DOM reading, screenshot/OCR/vision, file access, messaging, wireless, or
// tool execution — it only describes records.

import type {
  OverlaySessionRecord,
  OverlaySessionSource,
  OverlaySessionStatus,
} from "../../types/overlayManagerSessions";

export type OverlaySessionTone = "good" | "warn" | "danger" | "neutral" | "info";

// ---------------------------------------------------------------------------
// Status labels and tones
// ---------------------------------------------------------------------------

export function getOverlaySessionStatusLabel(
  status: OverlaySessionStatus,
): string {
  switch (status) {
    case "open_requested": return "Open requested";
    case "open": return "Open";
    case "closed": return "Closed";
    case "blocked": return "Blocked — non-actionable";
  }
}

export function getOverlaySessionStatusTone(
  status: OverlaySessionStatus,
): OverlaySessionTone {
  switch (status) {
    case "open_requested": return "info";
    case "open": return "good";
    case "closed": return "neutral";
    case "blocked": return "danger";
  }
}

/** Whether a status represents a blocked (non-actionable) overlay record. */
export function isOverlaySessionBlocked(status: OverlaySessionStatus): boolean {
  return status === "blocked";
}

// ---------------------------------------------------------------------------
// Source labels
// ---------------------------------------------------------------------------

export function getOverlaySessionSourceLabel(
  source: OverlaySessionSource,
): string {
  switch (source) {
    case "prop_toggle": return "Prop toggle";
    case "app_state": return "App state";
    case "system": return "System";
    case "user_action": return "User action";
  }
}

// ---------------------------------------------------------------------------
// Boundary labels — what overlay session visibility does NOT do.
// ---------------------------------------------------------------------------

/** Fixed boundary labels describing what overlay session visibility does NOT do. */
export function getOverlaySessionBoundaryLabels(): string[] {
  return [
    "Overlay session audit only",
    "No OverlayManager behavior change",
    "No show/hide change",
    "No z-index/focus/pointer-events change",
    "No sensitive overlay governance",
    "No capture",
    "No automation",
    "No DOM read",
    "No click/type/scroll",
    "No screenshot/OCR/vision",
    "No external action",
    "No file access",
    "No messaging",
    "No wireless/device control",
    "No tool execution",
    "No approve/run/execute/open/close",
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
export function getOverlaySessionSafetyFlagSummary(
  record: OverlaySessionRecord,
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
    `sensitive surface: ${record.sensitiveSurfaceEnabled}`,
  ];
}

/** Compact, comma-joined posture summary for inline display. */
export function getOverlaySessionPostureSummary(
  record: OverlaySessionRecord,
): string {
  return record.postures.length > 0 ? record.postures.join(", ") : "unclassified";
}
