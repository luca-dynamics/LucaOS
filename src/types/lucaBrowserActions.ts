// LucaBrowser action types — PR #138: LucaBrowser Action Readiness Bundle.
//
// This is the *pre-execution* model for human-confirmed browser actions in
// governed LucaBrowser mode. It describes a proposed action (click/type/scroll/
// back/forward/refresh/lifecycle) so LucaOS can queue it for human review.
//
// Hard guarantees — these types and the systems built on them NEVER:
//   - execute a real browser action (click/type/scroll/submit/etc.)
//   - read the DOM, page content, or page title from the page
//   - store passwords, tokens, seed phrases, cookies, API keys, or OTPs
//   - store DOM selectors (targetDescriptor is a user-facing description only)
//   - perform downloads/uploads, payments, wallet, or credential entry
//
// `allowedForExecution` is ALWAYS false in this layer. Eligible actions are at
// most `confirmed_for_future_execution` — a human-confirmed intent that a later,
// separate PR (behind explicit confirmation) could act on.

export type LucaBrowserActionKind =
  // Allowed (queue-only) proposal kinds.
  | "propose_click"
  | "propose_type"
  | "propose_scroll"
  | "propose_back"
  | "propose_forward"
  | "propose_refresh"
  | "propose_close"
  | "propose_pause"
  | "propose_resume"
  | "propose_revoke"
  // Blocked kinds — recorded as blocked, never eligible.
  | "submit_form"
  | "login"
  | "enter_password"
  | "enter_credential"
  | "payment"
  | "checkout"
  | "wallet_connect"
  | "wallet_transaction"
  | "download"
  | "upload"
  | "file_attach"
  | "read_dom"
  | "scrape"
  | "screenshot"
  | "ocr"
  | "execute_script";

export type LucaBrowserActionStatus =
  | "proposed"
  | "waiting_user_confirmation"
  | "confirmed_for_future_execution"
  | "blocked"
  | "revoked"
  | "archived";

export type LucaBrowserActionRiskLevel = "low" | "elevated" | "high" | "critical";

export interface LucaBrowserActionPolicyDecision {
  /** Hard guarantee: real execution is never allowed by this layer. */
  allowedForExecution: false;
  /** Whether a future, separate, human-confirmed-execution PR could act on this. */
  allowedForFutureHumanConfirmedExecution: boolean;
  riskLevel: LucaBrowserActionRiskLevel;
  blockedBy: string[];
  userSafeReason: string;
  requiresHumanConfirmation: true;
  requiresAuditLog: true;
  requiresObservationSnapshot: true;
  requiresActiveGovernedSession: true;
  requiresCredentialBoundary: true;
  automationEnabled: false;
  domReadEnabled: false;
  pageContentReadEnabled: false;
  screenshotEnabled: false;
  ocrEnabled: false;
  credentialsEnabled: false;
  downloadUploadEnabled: false;
  walletPaymentEnabled: false;
}

export interface LucaBrowserActionRequest {
  actionRequestId: string;
  shellSessionId: string;
  observationId?: string;
  kind: LucaBrowserActionKind;
  title: string;
  summary: string;
  /** User-facing description of the target — NEVER a DOM selector. */
  targetDescriptor?: string;
  /** Sanitized + capped preview of typed text. Never credential-like. */
  typedTextPreview?: string;
  status: LucaBrowserActionStatus;
  riskLevel: LucaBrowserActionRiskLevel;
  policyDecision: LucaBrowserActionPolicyDecision;
  provenanceIds: string[];
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  revokedAt?: string;
  blockedBy?: string[];
  metadata?: Record<string, unknown>;
}

export interface LucaBrowserActionDiagnosticsSummary {
  totalActionRequests: number;
  proposedRequests: number;
  waitingConfirmationRequests: number;
  confirmedForFutureExecutionRequests: number;
  blockedRequests: number;
  revokedRequests: number;
  archivedRequests: number;
  lastActionAt: string | null;
  executionEnabled: false;
  humanConfirmationRequired: true;
  automationEnabled: false;
  domReadEnabled: false;
  pageContentReadEnabled: false;
  screenshotEnabled: false;
  ocrEnabled: false;
  credentialsEnabled: false;
  downloadUploadEnabled: false;
  walletPaymentEnabled: false;
}

/** Allowed (queue-only) proposal kinds. */
export const LUCA_BROWSER_ALLOWED_ACTION_KINDS: LucaBrowserActionKind[] = [
  "propose_click",
  "propose_type",
  "propose_scroll",
  "propose_back",
  "propose_forward",
  "propose_refresh",
  "propose_close",
  "propose_pause",
  "propose_resume",
  "propose_revoke",
];

/** Kinds that are always blocked and never eligible for future execution. */
export const LUCA_BROWSER_BLOCKED_ACTION_KINDS: LucaBrowserActionKind[] = [
  "submit_form",
  "login",
  "enter_password",
  "enter_credential",
  "payment",
  "checkout",
  "wallet_connect",
  "wallet_transaction",
  "download",
  "upload",
  "file_attach",
  "read_dom",
  "scrape",
  "screenshot",
  "ocr",
  "execute_script",
];

/** Lifecycle kinds map directly onto existing session controls. */
export const LUCA_BROWSER_LIFECYCLE_ACTION_KINDS: LucaBrowserActionKind[] = [
  "propose_back",
  "propose_forward",
  "propose_refresh",
  "propose_close",
  "propose_pause",
  "propose_resume",
  "propose_revoke",
];

export const MAX_LUCA_BROWSER_ACTION_REQUESTS = 200;
export const MAX_LUCA_BROWSER_TYPED_TEXT_PREVIEW = 80;

export const LUCA_BROWSER_ACTION_EVENT = "luca_browser_action_request";

// ---------------------------------------------------------------------------
// PR #139 — LucaBrowser Final Safe Lifecycle Execution.
//
// Only confirmed *safe lifecycle/control* actions can execute (back/forward/
// refresh/pause/resume/close/revoke). Page-level automation (click/type/scroll)
// and every blocked category stay disabled — this layer never clicks, types,
// scrolls, reads the DOM/page content, screenshots, OCRs, or touches
// credentials/downloads/wallets/payments.
// ---------------------------------------------------------------------------

export type LucaBrowserActionExecutionStatus =
  | "not_executable"
  | "executed"
  | "blocked"
  | "failed"
  | "unsupported";

export interface LucaBrowserActionExecutionResult {
  executionResultId: string;
  actionRequestId: string;
  shellSessionId: string;
  kind: LucaBrowserActionKind;
  status: LucaBrowserActionExecutionStatus;
  message: string;
  executedAt: string;
  blockedBy?: string[];
  automationEnabled: false;
  domReadEnabled: false;
  pageContentReadEnabled: false;
  screenshotEnabled: false;
  ocrEnabled: false;
  credentialsEnabled: false;
  downloadUploadEnabled: false;
  walletPaymentEnabled: false;
  metadata?: Record<string, unknown>;
}

export interface LucaBrowserActionExecutionDiagnosticsSummary {
  totalExecutionResults: number;
  executedResults: number;
  blockedResults: number;
  failedResults: number;
  unsupportedResults: number;
  notExecutableResults: number;
  lastExecutionAt: string | null;
  /** Only back/forward/refresh/pause/resume/close/revoke can execute. */
  safeLifecycleExecutionEnabled: true;
  /** Click/type/scroll and all page-level automation stay disabled. */
  pageActionExecutionEnabled: false;
  humanConfirmationRequired: true;
  automationEnabled: false;
  domReadEnabled: false;
  pageContentReadEnabled: false;
  screenshotEnabled: false;
  ocrEnabled: false;
  credentialsEnabled: false;
  downloadUploadEnabled: false;
  walletPaymentEnabled: false;
}

/** Safe lifecycle/control kinds that PR #139 can execute after confirmation. */
export const LUCA_BROWSER_SAFE_LIFECYCLE_EXECUTION_KINDS: LucaBrowserActionKind[] =
  LUCA_BROWSER_LIFECYCLE_ACTION_KINDS;

/** Safe nav-control kinds dispatched to the mounted governed LucaBrowser. */
export const LUCA_BROWSER_SAFE_CONTROL_NAV_KINDS: LucaBrowserActionKind[] = [
  "propose_back",
  "propose_forward",
  "propose_refresh",
];

export const MAX_LUCA_BROWSER_ACTION_EXECUTION_RESULTS = 200;

export const LUCA_BROWSER_ACTION_EXECUTION_EVENT = "luca_browser_action_execution";

/** DOM CustomEvent name the governed LucaBrowser listens for. */
export const LUCA_BROWSER_SAFE_CONTROL_EVENT = "luca:luca-browser-safe-control-action";

export interface LucaBrowserSafeControlEventDetail {
  actionRequestId: string;
  shellSessionId: string;
  kind: LucaBrowserActionKind;
}
