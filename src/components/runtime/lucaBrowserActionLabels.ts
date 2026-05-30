// lucaBrowserActionLabels — PR #138: LucaBrowser Action Readiness Bundle.
// Pure helper functions for labels, tones, safeguard checklists, and
// no-execution copy for the LucaBrowser human-confirmed action queue.
//
// No service imports. No localStorage. No execution. No side effects.
// Nothing here enables a browser action, automation, DOM reading, or capture.

import type {
  LucaBrowserActionKind,
  LucaBrowserActionRequest,
  LucaBrowserActionRiskLevel,
  LucaBrowserActionStatus,
} from "../../types/lucaBrowserActions";

export type LucaBrowserActionTone = "good" | "warn" | "danger" | "neutral" | "info";

export const LUCA_BROWSER_ACTION_NO_EXECUTION_TEXT =
  "Queued only — Luca cannot perform this browser action yet.";

export function getLucaBrowserActionKindLabel(kind: LucaBrowserActionKind): string {
  switch (kind) {
    case "propose_click": return "Click (proposed)";
    case "propose_type": return "Type (proposed)";
    case "propose_scroll": return "Scroll (proposed)";
    case "propose_back": return "Back (proposed)";
    case "propose_forward": return "Forward (proposed)";
    case "propose_refresh": return "Refresh (proposed)";
    case "propose_close": return "Close (proposed)";
    case "propose_pause": return "Pause (proposed)";
    case "propose_resume": return "Resume (proposed)";
    case "propose_revoke": return "Revoke (proposed)";
    case "submit_form": return "Submit form (blocked)";
    case "login": return "Login (blocked)";
    case "enter_password": return "Enter password (blocked)";
    case "enter_credential": return "Enter credential (blocked)";
    case "payment": return "Payment (blocked)";
    case "checkout": return "Checkout (blocked)";
    case "wallet_connect": return "Wallet connect (blocked)";
    case "wallet_transaction": return "Wallet transaction (blocked)";
    case "download": return "Download (blocked)";
    case "upload": return "Upload (blocked)";
    case "file_attach": return "File attach (blocked)";
    case "read_dom": return "Read DOM (blocked)";
    case "scrape": return "Scrape (blocked)";
    case "screenshot": return "Screenshot (blocked)";
    case "ocr": return "OCR (blocked)";
    case "execute_script": return "Execute script (blocked)";
  }
}

export function getLucaBrowserActionStatusLabel(status: LucaBrowserActionStatus): string {
  switch (status) {
    case "proposed": return "Proposed";
    case "waiting_user_confirmation": return "Waiting for confirmation";
    case "confirmed_for_future_execution": return "Confirmed for future execution";
    case "blocked": return "Blocked";
    case "revoked": return "Revoked";
    case "archived": return "Archived";
  }
}

export function getLucaBrowserActionStatusTone(status: LucaBrowserActionStatus): LucaBrowserActionTone {
  switch (status) {
    case "confirmed_for_future_execution": return "good";
    case "waiting_user_confirmation": return "warn";
    case "blocked": return "danger";
    case "revoked": return "neutral";
    case "archived": return "neutral";
    case "proposed": return "info";
  }
}

export function getLucaBrowserActionRiskLabel(risk: LucaBrowserActionRiskLevel): string {
  switch (risk) {
    case "low": return "Low risk";
    case "elevated": return "Elevated risk";
    case "high": return "High risk";
    case "critical": return "Critical risk";
  }
}

export function getLucaBrowserActionRiskTone(risk: LucaBrowserActionRiskLevel): LucaBrowserActionTone {
  switch (risk) {
    case "low": return "good";
    case "elevated": return "warn";
    case "high": return "warn";
    case "critical": return "danger";
  }
}

/** Required-safeguard checklist for any future browser action execution. */
export function getLucaBrowserActionSafeguardLabels(): string[] {
  return [
    "Human confirmation required",
    "Active governed session required",
    "Observation snapshot required",
    "Audit log required",
    "Credential boundary enforced",
    "Execution disabled",
    "No DOM read",
    "No page content",
    "No screenshot/OCR",
    "No downloads/uploads",
    "No wallet/payment",
  ];
}

export function getLucaBrowserActionSummary(request: LucaBrowserActionRequest): string {
  const kind = getLucaBrowserActionKindLabel(request.kind);
  const status = getLucaBrowserActionStatusLabel(request.status);
  return `${kind} · ${status}`;
}

/** The next user-facing step for a request (review-only — never "execute"). */
export function getLucaBrowserActionNextAction(request: LucaBrowserActionRequest): string {
  switch (request.status) {
    case "waiting_user_confirmation":
      return "Review and confirm for future execution, or revoke.";
    case "confirmed_for_future_execution":
      return "Confirmed for future execution. Luca still cannot perform it.";
    case "blocked":
      return request.blockedBy && request.blockedBy.length > 0
        ? `Blocked by: ${request.blockedBy.join(", ")}.`
        : "Blocked. This action category is never allowed.";
    case "revoked":
      return "Revoked. No action will be taken.";
    case "archived":
      return "Archived for the record.";
    case "proposed":
      return "Awaiting evaluation.";
  }
}

export function getLucaBrowserActionNoExecutionText(): string {
  return LUCA_BROWSER_ACTION_NO_EXECUTION_TEXT;
}
