// SandboxedBrowserUrlPolicy — PR #134: Gated Browser Shell Prototype.
// Pure, string-only helpers that normalize, validate, classify, and redact a
// candidate URL before it could ever be opened in the Luca sandbox browser shell.
//
// Hard guarantees:
//   - This file NEVER fetches a URL.
//   - This file NEVER calls the network, DNS, or any API.
//   - This file NEVER inspects page content or the DOM.
//   - It only parses / classifies the URL string.

export type SandboxedBrowserUrlRiskLevel = "low" | "elevated" | "high" | "critical";

export interface SandboxedBrowserUrlPolicyResult {
  allowed: boolean;
  inputUrl: string;
  normalizedUrl?: string;
  auditUrl: string;
  riskLevel: SandboxedBrowserUrlRiskLevel;
  blockedBy: string[];
  userSafeReason: string;
}

// Maximum accepted URL length.
export const MAX_SANDBOXED_BROWSER_URL_LENGTH = 2_048;

// Schemes that are never allowed for the browser shell.
const BLOCKED_SCHEMES = [
  "javascript:",
  "data:",
  "file:",
  "blob:",
  "chrome:",
  "chrome-extension:",
  "devtools:",
  "about:",
  "ftp:",
  "ws:",
  "wss:",
  "mailto:",
  "tel:",
  "vbscript:",
];

// Query/hash params or path tokens that look secret-bearing or auth-bearing.
const SECRET_PARAM_PATTERN =
  /(^|[?&#/._-])(token|access[_-]?token|id[_-]?token|refresh[_-]?token|password|passwd|pwd|api[_-]?key|apikey|secret|client[_-]?secret|session|sessionid|sid|cookie|auth|authorization|code|otp|2fa)\b/i;

// Wallet / payment / trading routes detectable from the path or host.
const WALLET_PAYMENT_PATTERN =
  /(^|[/.-])(wallet|payments?|checkout|cart|billing|sign|signing|signature|transaction|transactions|swap|trade|trading|stake|staking|bridge|withdraw|deposit)([/.-]|$)/i;

// Download / upload / file-attachment routes detectable from the path.
const DOWNLOAD_UPLOAD_PATTERN =
  /(^|[/.-])(download|downloads|upload|uploads|attachment|attachments|export|getfile)([/.-]|$)/i;

// Risky file extensions that should never be opened in the shell.
const RISKY_FILE_EXTENSION_PATTERN =
  /\.(exe|msi|dmg|pkg|deb|rpm|apk|bat|cmd|sh|ps1|jar|scr|com|zip|rar|7z|tar|gz)$/i;

// IPv4 literal detection (used to block raw private-network IPs except localhost).
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function isPrivateOrRawIpHost(host: string): boolean {
  const match = IPV4_PATTERN.exec(host);
  if (!match) return false;
  // 127.0.0.1 (loopback) is allowed and handled separately as localhost.
  if (host === "127.0.0.1") return false;
  return true;
}

function isLocalhostHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
}

/**
 * Trim surrounding whitespace and wrapping characters from a candidate URL.
 * Does not add a scheme — the URL must be explicit.
 */
export function normalizeSandboxedBrowserUrl(input: string): string | null {
  if (typeof input !== "string") return null;
  let value = input
    .trim()
    .replace(/\s+/g, "")
    .split("")
    .filter((char) => char.charCodeAt(0) > 0x1f)
    .join("");
  // Strip common wrapping like <https://...> or "https://...".
  value = value.replace(/^[<"']+/, "").replace(/[>"']+$/, "");
  if (value.length === 0) return null;
  if (value.length > MAX_SANDBOXED_BROWSER_URL_LENGTH) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  // Reject embedded credentials at normalization time.
  if (parsed.username || parsed.password) return null;
  return parsed.href;
}

/**
 * Redact query string and hash for audit logging so secret-like params never
 * appear in trace/inbox/control records.
 */
export function redactUrlForAudit(url: string): string {
  if (typeof url !== "string" || url.length === 0) return "";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Fall back to a coarse redaction of anything after ? or #.
    return url.split(/[?#]/)[0].slice(0, MAX_SANDBOXED_BROWSER_URL_LENGTH);
  }
  const hasQuery = parsed.search.length > 0;
  const hasHash = parsed.hash.length > 0;
  const base = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  const suffix = `${hasQuery ? "?[redacted]" : ""}${hasHash ? "#[redacted]" : ""}`;
  return `${base}${suffix}`.slice(0, MAX_SANDBOXED_BROWSER_URL_LENGTH);
}

/**
 * Classify the risk of a URL purely from its string. Never fetches.
 */
export function classifyUrlRisk(input: string): SandboxedBrowserUrlRiskLevel {
  const normalized = normalizeSandboxedBrowserUrl(input);
  if (!normalized) return "critical";
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    return "critical";
  }
  const haystack = `${parsed.host}${parsed.pathname}`;
  const params = `${parsed.search}${parsed.hash}`;
  if (SECRET_PARAM_PATTERN.test(params) || WALLET_PAYMENT_PATTERN.test(haystack)) return "critical";
  if (BLOCKED_SCHEMES.includes(parsed.protocol)) return "critical";
  if (DOWNLOAD_UPLOAD_PATTERN.test(haystack) || RISKY_FILE_EXTENSION_PATTERN.test(parsed.pathname)) return "high";
  if (isPrivateOrRawIpHost(parsed.hostname)) return "high";
  if (parsed.protocol === "http:" && !isLocalhostHost(parsed.hostname)) return "elevated";
  return "low";
}

/**
 * Returns true when the URL is blocked by policy (any blocking reason).
 */
export function isBlockedBrowserUrl(input: string): boolean {
  return !validateSandboxedBrowserUrl(input).allowed;
}

/**
 * Build a user-facing safe reason from a policy result.
 */
export function getUrlPolicyReason(result: SandboxedBrowserUrlPolicyResult): string {
  if (result.allowed) {
    return "This URL passed safe-URL validation. It can be opened in the Luca sandbox browser shell after approval and an explicit Run once.";
  }
  if (result.userSafeReason) return result.userSafeReason;
  return buildBlockedReason(result.blockedBy);
}

function buildBlockedReason(blockedBy: string[]): string {
  if (blockedBy.includes("empty_url")) return "No URL was provided.";
  if (blockedBy.includes("invalid_url")) return "This is not a valid, explicit URL.";
  if (blockedBy.includes("url_too_long")) return `This URL exceeds the maximum length of ${MAX_SANDBOXED_BROWSER_URL_LENGTH} characters.`;
  if (blockedBy.includes("blocked_scheme")) return "This URL uses a scheme that is not allowed in the sandbox browser shell.";
  if (blockedBy.includes("scheme_not_https")) return "Only https:// URLs (or http://localhost for local dev) can be opened in the sandbox browser shell.";
  if (blockedBy.includes("embedded_credentials")) return "This URL embeds a username or password and cannot be opened.";
  if (blockedBy.includes("secret_like_params")) return "This URL contains token/secret/session/auth-like parameters and cannot be opened.";
  if (blockedBy.includes("wallet_or_payment_route")) return "This URL points at a wallet, payment, checkout, or trading route and cannot be opened.";
  if (blockedBy.includes("download_or_upload_route")) return "This URL points at a download, upload, or file route and cannot be opened.";
  if (blockedBy.includes("private_network")) return "This URL targets a raw or private-network IP address and cannot be opened.";
  return "This URL is blocked by the sandbox browser shell policy.";
}

/**
 * Validate a candidate URL for the sandbox browser shell. String-only; never
 * fetches, never touches the network, never reads page content.
 */
export function validateSandboxedBrowserUrl(input: string): SandboxedBrowserUrlPolicyResult {
  const inputUrl = typeof input === "string" ? input : "";
  const blockedBy: string[] = [];

  const trimmed = inputUrl.trim();
  if (trimmed.length === 0) {
    blockedBy.push("empty_url");
    return finalize(inputUrl, undefined, blockedBy, "critical");
  }
  if (trimmed.length > MAX_SANDBOXED_BROWSER_URL_LENGTH) {
    blockedBy.push("url_too_long");
    return finalize(inputUrl, undefined, blockedBy, "high");
  }

  // Detect blocked schemes even when normalization would otherwise reject them.
  const lowered = trimmed.toLowerCase();
  const matchedBlockedScheme = BLOCKED_SCHEMES.find((scheme) => lowered.startsWith(scheme));
  if (matchedBlockedScheme) {
    blockedBy.push("blocked_scheme");
    return finalize(inputUrl, undefined, blockedBy, "critical");
  }

  const normalized = normalizeSandboxedBrowserUrl(trimmed);
  if (!normalized) {
    // Could be invalid, or embedded credentials (which normalize rejects).
    if (/^[a-z][a-z0-9+.-]*:\/\/[^/@\s]*@/i.test(trimmed)) {
      blockedBy.push("embedded_credentials");
      return finalize(inputUrl, undefined, blockedBy, "critical");
    }
    blockedBy.push("invalid_url");
    return finalize(inputUrl, undefined, blockedBy, "critical");
  }

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    blockedBy.push("invalid_url");
    return finalize(inputUrl, undefined, blockedBy, "critical");
  }

  if (parsed.username || parsed.password) {
    blockedBy.push("embedded_credentials");
  }

  if (BLOCKED_SCHEMES.includes(parsed.protocol)) {
    blockedBy.push("blocked_scheme");
  } else if (parsed.protocol !== "https:") {
    // Allow http only for localhost / loopback dev.
    const isLocalDevHttp = parsed.protocol === "http:" && isLocalhostHost(parsed.hostname);
    if (!isLocalDevHttp) blockedBy.push("scheme_not_https");
  }

  if (isPrivateOrRawIpHost(parsed.hostname)) {
    blockedBy.push("private_network");
  }

  const haystack = `${parsed.host}${parsed.pathname}`;
  const params = `${parsed.search}${parsed.hash}`;

  if (SECRET_PARAM_PATTERN.test(params)) {
    blockedBy.push("secret_like_params");
  }
  if (WALLET_PAYMENT_PATTERN.test(haystack)) {
    blockedBy.push("wallet_or_payment_route");
  }
  if (DOWNLOAD_UPLOAD_PATTERN.test(haystack) || RISKY_FILE_EXTENSION_PATTERN.test(parsed.pathname)) {
    blockedBy.push("download_or_upload_route");
  }

  const riskLevel = classifyUrlRisk(normalized);
  return finalize(inputUrl, blockedBy.length === 0 ? normalized : undefined, blockedBy, riskLevel);
}

function finalize(
  inputUrl: string,
  normalizedUrl: string | undefined,
  blockedBy: string[],
  riskLevel: SandboxedBrowserUrlRiskLevel,
): SandboxedBrowserUrlPolicyResult {
  const allowed = blockedBy.length === 0 && Boolean(normalizedUrl);
  const auditUrl = redactUrlForAudit(normalizedUrl ?? inputUrl);
  const result: SandboxedBrowserUrlPolicyResult = {
    allowed,
    inputUrl,
    normalizedUrl: allowed ? normalizedUrl : undefined,
    auditUrl,
    riskLevel,
    blockedBy,
    userSafeReason: "",
  };
  result.userSafeReason = getUrlPolicyReason(result);
  return result;
}
