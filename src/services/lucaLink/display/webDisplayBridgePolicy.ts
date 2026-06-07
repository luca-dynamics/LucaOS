import {
  LUCA_LINK_WEB_DISPLAY_BLOCKED_ACTIONS,
  type LucaLinkWebDisplayBridgePolicyEvaluation,
  type LucaLinkWebDisplayBridgePolicyOptions,
  type LucaLinkWebDisplaySessionIntent,
} from "./webDisplayBridgeTypes";

const BLOCKED_URL_PROTOCOLS = new Set([
  "javascript:",
  "data:",
  "file:",
  "chrome:",
  "chrome-extension:",
  "extension:",
  "blob:",
]);

const SENSITIVE_CONTENT_PATTERNS = [
  /hidden\s+(?:system\s+)?prompt/i,
  /private\s+reasoning/i,
  /chain[ -]of[ -]thought/i,
  /raw\s+files?/i,
  /raw\s+(?:memory|database)/i,
];

const CREDENTIAL_KEY_PATTERN =
  /(?:^|[?&#/._-])(access[_-]?token|auth(?:orization)?|api[_-]?key|client[_-]?secret|credential|password|passwd|secret|session[_-]?token|token)(?:=|:|\/|$)/i;
const TOKEN_VALUE_PATTERN =
  /(?:bearer%?20|eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.|(?:token|secret|password)=)[^&#\s]{8,}/i;

function asDate(value: string | Date | undefined): Date {
  return value instanceof Date ? value : new Date(value ?? Date.now());
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function containsSensitiveDisplayBridgeContent(value: string): boolean {
  return SENSITIVE_CONTENT_PATTERNS.some((pattern) => pattern.test(value));
}

export function sanitizeLucaLinkWebDisplayUrlPreview(
  value: string,
): { sanitizedUrlPreview?: string; blocker?: string } {
  const trimmed = value.trim();
  if (!trimmed) return {};

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { blocker: "URL preview must be a valid absolute HTTP(S) URL." };
  }

  if (BLOCKED_URL_PROTOCOLS.has(parsed.protocol.toLowerCase())) {
    return { blocker: `URL scheme ${parsed.protocol} is blocked.` };
  }
  if (!['http:', 'https:'].includes(parsed.protocol.toLowerCase())) {
    return { blocker: "Only HTTP(S) URL previews are supported." };
  }
  if (parsed.username || parsed.password) {
    return { blocker: "Credential-bearing URL previews are blocked." };
  }
  if (
    CREDENTIAL_KEY_PATTERN.test(trimmed) ||
    TOKEN_VALUE_PATTERN.test(trimmed)
  ) {
    return { blocker: "Credential or token-like URL previews are blocked." };
  }
  if (containsSensitiveDisplayBridgeContent(decodeURIComponentSafe(trimmed))) {
    return { blocker: "Sensitive hidden, reasoning, or raw-file content is blocked." };
  }

  parsed.hash = "";
  return { sanitizedUrlPreview: parsed.toString() };
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function evaluateLucaLinkWebDisplayBridgePolicy(
  intent: LucaLinkWebDisplaySessionIntent,
  options: LucaLinkWebDisplayBridgePolicyOptions = {},
): LucaLinkWebDisplayBridgePolicyEvaluation {
  const blockers = [...intent.blockers];
  const warnings = [...intent.warnings];
  const now = asDate(options.now);
  const expiresAt = new Date(intent.expiresAt);
  let sanitizedUrlPreview: string | undefined;

  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
    blockers.push("Display session intent has expired.");
  }
  if (intent.requestedCapability !== "display.present") {
    blockers.push("Only the display.present capability is supported.");
  }
  if (containsSensitiveDisplayBridgeContent(intent.title)) {
    blockers.push("Sensitive hidden, reasoning, or raw-file content is blocked.");
  }

  if (intent.urlPreview) {
    const urlResult = sanitizeLucaLinkWebDisplayUrlPreview(intent.urlPreview);
    sanitizedUrlPreview = urlResult.sanitizedUrlPreview;
    if (urlResult.blocker) blockers.push(urlResult.blocker);
  }

  for (const action of options.requestedActions ?? []) {
    if (
      action !== "read_only" &&
      action !== "presentation_only" &&
      !LUCA_LINK_WEB_DISPLAY_BLOCKED_ACTIONS.includes(
        action as (typeof LUCA_LINK_WEB_DISPLAY_BLOCKED_ACTIONS)[number],
      )
    ) {
      blockers.push(`Requested action ${action} is outside display bridge policy.`);
    } else if (action !== "read_only" && action !== "presentation_only") {
      blockers.push(`Requested action ${action} is blocked.`);
    }
  }

  if (intent.privacyLevel === "private" && !options.explicitPrivateApproval) {
    warnings.push("Private display content requires explicit host approval.");
  }
  warnings.push("Display presentation requires host approval and remains preview-only.");

  const uniqueBlockers = unique(blockers);
  const expired = uniqueBlockers.includes("Display session intent has expired.");
  const status = expired
    ? "expired"
    : uniqueBlockers.length > 0
      ? "blocked"
      : intent.status === "approved_preview"
        ? "approved_preview"
        : "approval_required";

  return {
    allowedForPreview: status === "approved_preview",
    status,
    sanitizedUrlPreview,
    hostApprovalRequired: true,
    blockers: uniqueBlockers,
    warnings: unique(warnings),
    sideEffectsPerformed: false,
  };
}
