// SandboxedBrowserPolicy — PR #133: Sandboxed Browser Prototype, research/design only.
// Classifies how a FUTURE sandboxed browser request would be permissioned.
// It never launches a browser, automates anything, reads the DOM, scrapes,
// clicks, types, submits, logs in, downloads/uploads, or touches the network.
//
// No browser APIs. No DOM APIs. No network APIs. No BrowserWindow/webview
// creation. No filesystem APIs. No credential storage.

import type {
  SandboxedBrowserCapability,
  SandboxedBrowserCredentialBoundary,
  SandboxedBrowserNavigationRisk,
  SandboxedBrowserPolicyDecision,
  SandboxedBrowserRiskLevel,
  SandboxedBrowserSurface,
} from "../../types/sandboxedBrowser";

const SECRET_PATTERNS = [
  /\btoken\b/i,
  /\bsecret\b/i,
  /\bapi[_-]?key\b/i,
  /\bprivate[_-]?key\b/i,
  /\bpassword\b/i,
  /\bpasscode\b/i,
  /\bcredential\b/i,
  /\bmnemonic\b/i,
  /\bseed phrase\b/i,
  /\bsession cookie\b/i,
  /\b2fa\b|\botp\b|\bone[- ]?time code\b/i,
  /sk-[A-Za-z0-9_-]{8,}/,
  /gh[pousr]_[A-Za-z0-9_]{12,}/,
  /AIza[A-Za-z0-9_-]{12,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

export interface SandboxedBrowserIntentInput {
  message: string;
  source?: string;
  sourceId?: string;
  targetDescriptor?: string;
  metadata?: Record<string, unknown>;
}

export interface SandboxedBrowserEvaluationInput extends SandboxedBrowserIntentInput {
  surface?: SandboxedBrowserSurface;
  capability?: SandboxedBrowserCapability;
}

export interface SanitizedSandboxedBrowserInput {
  message: string;
  source: string;
  sourceId?: string;
  targetDescriptor?: string;
  metadata: Record<string, unknown>;
  secretLike: boolean;
}

function scrubSecretLikeText(value: string): string {
  return SECRET_PATTERNS.reduce((current, pattern) => current.replace(pattern, "[redacted]"), value).slice(0, 1_000);
}

export function blockIfBrowserSecretLike(input: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(input));
}

export function sanitizeSandboxedBrowserInput(input: SandboxedBrowserIntentInput): SanitizedSandboxedBrowserInput {
  const message = scrubSecretLikeText(input.message ?? "");
  const targetDescriptor = input.targetDescriptor ? scrubSecretLikeText(input.targetDescriptor).slice(0, 160) : undefined;
  const metadata = Object.fromEntries(
    Object.entries(input.metadata ?? {}).slice(0, 30).map(([key, value]) => {
      const safeKey = scrubSecretLikeText(key).slice(0, 80);
      if (/secret|token|password|api[_-]?key|credential|private[_-]?key|cookie|otp|2fa/i.test(key)) return [safeKey, "[redacted]"];
      if (typeof value === "string") return [safeKey, scrubSecretLikeText(value).slice(0, 300)];
      if (typeof value === "number" || typeof value === "boolean" || value === null) return [safeKey, value];
      return [safeKey, "[object]"];
    }),
  );

  return {
    message,
    source: scrubSecretLikeText(input.source ?? "sandboxed_browser").slice(0, 80),
    sourceId: input.sourceId ? scrubSecretLikeText(input.sourceId).slice(0, 120) : undefined,
    targetDescriptor,
    metadata,
    secretLike: blockIfBrowserSecretLike(input.message ?? "") || Boolean(input.targetDescriptor && blockIfBrowserSecretLike(input.targetDescriptor)),
  };
}

export function detectSandboxedBrowserCapability(message: string): SandboxedBrowserCapability {
  if (/\blog ?in\b|\bsign ?in\b|\bsign ?on\b|\benter (my )?password\b|\bauthenticate\b/i.test(message)) return "login";
  if (/\bconnect wallet\b|\bwallet connect\b|\blink wallet\b/i.test(message)) return "wallet_connect";
  if (/\bwallet\b.*\b(transaction|transfer|send|sign)\b|\bswap\b|\btrade\b|\bsign transaction\b/i.test(message)) return "wallet_transaction";
  if (/\bcheckout\b|\bpayment\b|\bpay\b|\bbuy\b|\bpurchase\b|\border\b/i.test(message)) return "payment";
  if (/\bdownload\b|\bsave file\b|\bget the file\b/i.test(message)) return "download_file";
  if (/\bupload\b|\battach (a )?file\b|\bsend (a )?file\b/i.test(message)) return "upload_file";
  if (/\bsubmit (the )?form\b|\bsubmit\b/i.test(message)) return "submit_form";
  if (/\btype\b|\bfill (in|out)\b|\benter (text|into)\b|\binput\b/i.test(message)) return "type";
  if (/\bclick\b|\btap\b|\bpress (the )?(button|link)\b/i.test(message)) return "click";
  if (/\bscrape\b|\bextract (the )?(page|content|data)\b|\bharvest\b/i.test(message)) return "scrape";
  if (/\bread (the )?dom\b|\binspect (the )?dom\b|\bread (this |the )?page\b|\bparse (the )?page\b/i.test(message)) return "read_dom";
  if (/\bpage title\b|\bpage metadata\b|\bmeta tags?\b|\bheadings?\b/i.test(message)) return "read_page_metadata";
  if (/\bnavigate to\b|\bgo to\b|\bbrowse to\b/i.test(message)) return "navigate";
  if (/\bopen (the )?(url|website|site|page|link|browser|chrome|tab)\b|\bopen https?:\/\//i.test(message)) return "open_url";
  return "unknown";
}

export function detectSandboxedBrowserSurface(message: string): SandboxedBrowserSurface {
  if (/\bwallet\b|\bswap\b|\btrade\b|\bsign transaction\b/i.test(message)) return "browser_wallet";
  if (/\bcheckout\b|\bpayment\b|\bpay\b|\bbuy\b|\bpurchase\b/i.test(message)) return "browser_payment";
  if (/\bupload\b|\battach (a )?file\b/i.test(message)) return "browser_upload";
  if (/\bdownload\b|\bsave file\b/i.test(message)) return "browser_download";
  if (/\bform\b|\binput\b|\bfield\b|\blog ?in\b|\bsign ?in\b|\bsubmit\b/i.test(message)) return "browser_form";
  if (/\bdom\b|\bscrape\b|\bclick\b|\bpage\b|\belement\b/i.test(message)) return "browser_page";
  if (/\btab\b/i.test(message)) return "browser_tab";
  if (/\bopen (the )?(url|website|site|link|browser|chrome)\b|\bnavigate to\b|\bgo to\b|\bbrowse to\b|\bopen https?:\/\//i.test(message)) return "sandboxed_browser";
  return "unknown";
}

export function detectNavigationRisk(message: string): SandboxedBrowserNavigationRisk {
  if (blockIfBrowserSecretLike(message)) return "credential_or_secret";
  if (/\blog ?in\b|\bsign ?in\b|\bsign ?on\b|\bauthenticate\b|\bauth\b/i.test(message)) return "auth_required";
  if (/\bcheckout\b|\bpayment\b|\bpay\b|\bbuy\b|\bpurchase\b|\bwallet\b|\btransaction\b|\bswap\b|\btrade\b/i.test(message)) return "payment_or_wallet";
  if (/\bdownload\b|\bupload\b|\battach (a )?file\b|\bsave file\b/i.test(message)) return "download_or_upload";
  if (/https?:\/\/|\bwww\.|\b\.com\b|\b\.io\b|\b\.org\b|\bexternal\b|\bunknown site\b/i.test(message)) return "external_unknown";
  if (/\binternal\b|\bthis app\b|\blocal\b/i.test(message)) return "internal_safe";
  return "unknown";
}

export function detectCredentialBoundary(message: string): SandboxedBrowserCredentialBoundary {
  if (/\bwallet\b|\bswap\b|\btrade\b|\btransaction\b/i.test(message)) return "wallet_blocked";
  if (/\bcheckout\b|\bpayment\b|\bpay\b|\bbuy\b|\bpurchase\b/i.test(message)) return "payment_blocked";
  if (/\bsession cookie\b|\bcookie\b|\bsession token\b/i.test(message)) return "session_cookie_blocked";
  if (blockIfBrowserSecretLike(message) || /\blog ?in\b|\bsign ?in\b/i.test(message)) return "credential_like_blocked";
  return "no_credentials";
}

function riskForBrowser(capability: SandboxedBrowserCapability, secretLike: boolean): SandboxedBrowserRiskLevel {
  if (secretLike) return "critical";
  switch (capability) {
    case "login":
    case "download_file":
    case "upload_file":
    case "payment":
    case "wallet_connect":
    case "wallet_transaction":
      return "critical";
    case "read_dom":
    case "scrape":
    case "click":
    case "type":
    case "submit_form":
      return "high";
    case "open_url":
    case "navigate":
    case "read_page_metadata":
      return "elevated";
    default:
      return "elevated";
  }
}

export function evaluateSandboxedBrowserRequest(
  input: SandboxedBrowserEvaluationInput,
): SandboxedBrowserPolicyDecision {
  const sanitized = sanitizeSandboxedBrowserInput(input);
  const surface = input.surface ?? detectSandboxedBrowserSurface(sanitized.message);
  const capability = input.capability ?? detectSandboxedBrowserCapability(sanitized.message);
  const navigationRisk = sanitized.secretLike ? "credential_or_secret" : detectNavigationRisk(sanitized.message);
  const credentialBoundary = sanitized.secretLike ? "credential_like_blocked" : detectCredentialBoundary(sanitized.message);
  const riskLevel = riskForBrowser(capability, sanitized.secretLike);
  const blockedBy: string[] = [];

  if (sanitized.secretLike) blockedBy.push("secret_like_content");
  if (capability === "login") blockedBy.push("login_credentials_blocked");
  if (capability === "download_file") blockedBy.push("download_blocked");
  if (capability === "upload_file") blockedBy.push("upload_blocked");
  if (capability === "payment") blockedBy.push("payment_blocked");
  if (capability === "wallet_connect" || capability === "wallet_transaction") blockedBy.push("wallet_blocked");
  if (capability === "read_dom" || capability === "scrape") blockedBy.push("dom_reading_disabled");

  const allowedForDryRun = blockedBy.length === 0 && (riskLevel === "low" || riskLevel === "elevated");

  const decision: SandboxedBrowserPolicyDecision = {
    allowedForLaunch: false,
    allowedForAutomation: false,
    allowedForDomRead: false,
    allowedForNetworkRequest: false,
    allowedForDryRun,
    riskLevel,
    surface,
    capability,
    navigationRisk,
    credentialBoundary,
    blockedBy,
    userSafeReason: "",
    requiresExplicitApproval: true,
    requiresVisibleBrowserBoundary: true,
    requiresSandbox: true,
    requiresHumanConfirmation: true,
    requiresCredentialBoundary: true,
    requiresAuditLog: true,
    requiresDownloadUploadBlock: true,
    requiresWalletPaymentBlock: true,
    revocable: true,
  };

  decision.userSafeReason = getSandboxedBrowserUserSafeReason(decision);
  return decision;
}

export function classifySandboxedBrowserIntent(
  input: SandboxedBrowserIntentInput,
): SandboxedBrowserPolicyDecision {
  return evaluateSandboxedBrowserRequest(input);
}

export function getSandboxedBrowserUserSafeReason(decision: SandboxedBrowserPolicyDecision): string {
  if (decision.blockedBy.includes("secret_like_content")) {
    return "Sandboxed browser blocked: the request references credential-like or sensitive content. Luca never handles passwords, tokens, cookies, or session content, and cannot launch, read, click, type, submit, scrape, download, upload, or automate a browser.";
  }
  if (decision.blockedBy.includes("login_credentials_blocked")) {
    return "Sandboxed browser blocked: login / credential entry is never performed by Luca. This stays a research-only record — no browser launch, automation, or credential handling happens.";
  }
  if (decision.blockedBy.includes("wallet_blocked")) {
    return "Sandboxed browser blocked: wallet connect / transactions are never automatic. No browser launch, wallet, or payment action happens — research-only record.";
  }
  if (decision.blockedBy.includes("payment_blocked")) {
    return "Sandboxed browser blocked: payment / checkout is never automatic. No browser launch or payment action happens — research-only record.";
  }
  if (decision.blockedBy.includes("download_blocked") || decision.blockedBy.includes("upload_blocked")) {
    return "Sandboxed browser blocked: file download/upload is disabled until a dedicated safety model exists. No browser launch or file transfer happens — research-only record.";
  }
  if (decision.blockedBy.includes("dom_reading_disabled")) {
    return "Sandboxed browser blocked: DOM reading / scraping is disabled. This stays a research-only record — no browser launch, DOM read, or scraping happens.";
  }
  if (decision.blockedBy.length > 0) {
    return `Sandboxed browser blocked for safety: ${decision.blockedBy.join(", ")}. No browser launch or automation is enabled.`;
  }
  if (decision.allowedForDryRun) {
    return `Sandboxed browser recorded as dry-run only for ${decision.surface}/${decision.capability}. Luca cannot launch, read, click, type, submit, scrape, download, upload, or automate a browser. Any future browser control would require explicit approval, a visible browser boundary, sandboxing, human confirmation per action, a credential boundary, audit logging, download/upload blocking, wallet/payment blocking, and remain revocable.`;
  }
  return `Sandboxed browser requires explicit approval before even a dry-run permission session for ${decision.surface}/${decision.capability}. Browser launch, automation, DOM read, and network requests are disabled.`;
}
