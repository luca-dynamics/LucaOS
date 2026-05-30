// LucaBrowserActionPolicy — PR #138: LucaBrowser Action Readiness Bundle.
// Pure, string-only helpers that classify, sanitize, and evaluate a *proposed*
// governed browser action before it could ever be queued for human review.
//
// Hard guarantees:
//   - This file NEVER executes a browser action.
//   - This file NEVER reads the DOM, page content, or page title.
//   - `allowedForExecution` is ALWAYS false.
//   - Credential-like / payment / wallet / download / upload / DOM / scrape /
//     screenshot / OCR / script intents are blocked.

import {
  LUCA_BROWSER_BLOCKED_ACTION_KINDS,
  LUCA_BROWSER_LIFECYCLE_ACTION_KINDS,
  MAX_LUCA_BROWSER_TYPED_TEXT_PREVIEW,
  type LucaBrowserActionKind,
  type LucaBrowserActionPolicyDecision,
  type LucaBrowserActionRiskLevel,
} from "../../types/lucaBrowserActions";

export interface LucaBrowserActionPolicyInput {
  kind: LucaBrowserActionKind;
  /** User-facing target description (never a DOM selector). */
  targetDescriptor?: string;
  /** Raw typed text candidate (sanitized + screened before use). */
  typedText?: string;
  /** Optional free-form context to screen for credential/payment intent. */
  context?: string;
}

// Credential / secret-like text: passwords, tokens, keys, seeds, OTPs, cookies.
const CREDENTIAL_LIKE_PATTERN =
  /(password|passwd|pwd|passphrase|seed\s*phrase|mnemonic|private\s*key|secret\s*key|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|id[_-]?token|bearer\s|client[_-]?secret|session[_-]?(id|token)|cookie|otp|one[-\s]?time\s*(code|password)|2fa|mfa\s*code|cvv|cvc|card\s*number|iban|routing\s*number|ssn|social\s*security)/i;

// Sequences that look like real secrets even without a keyword label.
const SECRET_SHAPE_PATTERNS: RegExp[] = [
  /\b[A-Za-z0-9_-]{32,}\b/,                 // long opaque token
  /\b(?:\d[ -]?){13,19}\b/,                 // card-number-like digit run
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,     // PEM private key
  /\b(?:[a-z]+\s){11,23}[a-z]+\b/i,         // BIP39-style seed phrase (12-24 words)
];

// Payment / wallet / financial intent.
const PAYMENT_WALLET_PATTERN =
  /(payment|pay\s|checkout|cart|billing|invoice|wallet|connect\s*wallet|metamask|seed|transaction|transfer|swap|trade|trading|stake|staking|bridge|withdraw|deposit|crypto|bitcoin|ethereum|card|credit\s*card|paypal)/i;

// Download / upload / file-attach intent.
const DOWNLOAD_UPLOAD_PATTERN =
  /(download|upload|attach\s*file|file\s*attach|attachment|save\s*as|export\s*file|choose\s*file)/i;

// Login / submit intent.
const LOGIN_SUBMIT_PATTERN =
  /(log\s*in|login|sign\s*in|signin|sign\s*up|register|submit\s*(the\s*)?form|authenticate|enter\s*(your\s*)?(password|credential|otp))/i;

// DOM / scrape / capture / script intent.
const DOM_CAPTURE_PATTERN =
  /(read\s*dom|inspect\s*dom|dom\s*tree|scrape|scraping|extract\s*(page|content|text)|screenshot|screen\s*shot|capture\s*screen|\bocr\b|execute\s*script|run\s*script|eval\s*\(|executejavascript)/i;

/**
 * Detect credential-like / secret-bearing text. Pure string check — never
 * stores or logs the input.
 */
export function detectCredentialLikeText(input?: string): boolean {
  if (typeof input !== "string" || input.length === 0) return false;
  if (CREDENTIAL_LIKE_PATTERN.test(input)) return true;
  return SECRET_SHAPE_PATTERNS.some((pattern) => pattern.test(input));
}

/**
 * Sanitize a typed-text candidate into a safe, capped preview. Returns
 * `undefined` if the text is credential-like (so it is never stored).
 */
export function sanitizeBrowserActionInput(input?: string): string | undefined {
  if (typeof input !== "string") return undefined;
  const collapsed = input.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) return undefined;
  if (detectCredentialLikeText(collapsed)) return undefined;
  // Strip control chars, then cap length.
  // eslint-disable-next-line no-control-regex
  const cleaned = collapsed.replace(/[\u0000-\u001f\u007f]/g, "");
  if (cleaned.length <= MAX_LUCA_BROWSER_TYPED_TEXT_PREVIEW) return cleaned;
  return `${cleaned.slice(0, MAX_LUCA_BROWSER_TYPED_TEXT_PREVIEW - 1)}…`;
}

/**
 * Classify the risk level of a proposed action from its kind + screened text.
 */
export function classifyLucaBrowserAction(input: LucaBrowserActionPolicyInput): LucaBrowserActionRiskLevel {
  const { kind } = input;
  const haystack = `${input.targetDescriptor ?? ""} ${input.typedText ?? ""} ${input.context ?? ""}`;

  if (LUCA_BROWSER_BLOCKED_ACTION_KINDS.includes(kind)) return "critical";
  if (detectCredentialLikeText(input.typedText) || detectCredentialLikeText(haystack)) return "critical";
  if (PAYMENT_WALLET_PATTERN.test(haystack) || DOWNLOAD_UPLOAD_PATTERN.test(haystack)) return "critical";
  if (LOGIN_SUBMIT_PATTERN.test(haystack) || DOM_CAPTURE_PATTERN.test(haystack)) return "high";

  // Lifecycle proposals are the lowest-risk; click/type/scroll are elevated.
  if (LUCA_BROWSER_LIFECYCLE_ACTION_KINDS.includes(kind)) return "low";
  if (kind === "propose_type") return "elevated";
  return "elevated";
}

function baseDecision(
  riskLevel: LucaBrowserActionRiskLevel,
  allowedForFuture: boolean,
  blockedBy: string[],
  userSafeReason: string,
): LucaBrowserActionPolicyDecision {
  return {
    allowedForExecution: false,
    allowedForFutureHumanConfirmedExecution: allowedForFuture,
    riskLevel,
    blockedBy,
    userSafeReason,
    requiresHumanConfirmation: true,
    requiresAuditLog: true,
    requiresObservationSnapshot: true,
    requiresActiveGovernedSession: true,
    requiresCredentialBoundary: true,
    automationEnabled: false,
    domReadEnabled: false,
    pageContentReadEnabled: false,
    screenshotEnabled: false,
    ocrEnabled: false,
    credentialsEnabled: false,
    downloadUploadEnabled: false,
    walletPaymentEnabled: false,
  };
}

/**
 * Evaluate a proposed action. Execution is never allowed; the decision only
 * states whether the action is eligible to be queued for future human-confirmed
 * execution, or hard-blocked.
 */
export function evaluateLucaBrowserActionRequest(
  input: LucaBrowserActionPolicyInput,
): LucaBrowserActionPolicyDecision {
  const { kind } = input;
  const riskLevel = classifyLucaBrowserAction(input);
  const haystack = `${input.targetDescriptor ?? ""} ${input.typedText ?? ""} ${input.context ?? ""}`;
  const blockedBy: string[] = [];

  if (LUCA_BROWSER_BLOCKED_ACTION_KINDS.includes(kind)) {
    blockedBy.push(`blocked_kind:${kind}`);
  }
  if (detectCredentialLikeText(input.typedText) || detectCredentialLikeText(haystack)) {
    blockedBy.push("credential_like_text");
  }
  if (PAYMENT_WALLET_PATTERN.test(haystack)) blockedBy.push("payment_or_wallet_context");
  if (DOWNLOAD_UPLOAD_PATTERN.test(haystack)) blockedBy.push("download_or_upload_context");
  if (LOGIN_SUBMIT_PATTERN.test(haystack)) blockedBy.push("login_or_submit_context");
  if (DOM_CAPTURE_PATTERN.test(haystack)) blockedBy.push("dom_scrape_or_capture_context");

  if (blockedBy.length > 0) {
    return baseDecision(
      "critical",
      false,
      blockedBy,
      "Blocked: this involves credentials, payments, wallets, downloads/uploads, login/submit, or DOM/scrape/screenshot/OCR/script — never allowed in governed LucaBrowser.",
    );
  }

  // No blocking context — allowed kinds are eligible for future human-confirmed
  // execution. Everything still queued only; nothing executes now.
  return baseDecision(
    riskLevel,
    true,
    [],
    "Eligible to queue for human review. Luca cannot perform this browser action yet — execution stays disabled.",
  );
}

/** Stable user-facing reason string for a decision. */
export function getLucaBrowserActionUserSafeReason(decision: LucaBrowserActionPolicyDecision): string {
  return decision.userSafeReason;
}
