/**
 * LucaLink Guest Session Policy (PR #198)
 *
 * Pure inbound/guest security model for classifying guest traffic, tracking
 * in-memory session state, sanitizing guest chat, and denying only clearly
 * unsafe guest attempts to exercise LucaLink/device/runtime authority.
 *
 * This module is side-effect-free: it does not open sockets, call network APIs,
 * touch storage, prompt for browser/device permissions, or execute any
 * shell/file/code/browser/payment/physical-world action.
 */

export type LucaLinkGuestSessionStatus =
  | "connected"
  | "auth-challenge"
  | "authenticated"
  | "active"
  | "expired"
  | "revoked"
  | "disconnected";

export type LucaLinkGuestInboundDecision =
  | "allow"
  | "deny"
  | "observe-only"
  | "require-auth"
  | "rate-limit"
  | "sanitize"
  | "invalid";

export type LucaLinkGuestInboundKind =
  | "guest-connected"
  | "guest-disconnected"
  | "guest-message"
  | "guest-auth-response"
  | "desktop-to-guest"
  | "webrtc-offer"
  | "webrtc-answer"
  | "webrtc-ice-candidate"
  | "unknown";

export interface LucaLinkGuestSessionRecord {
  sessionId: string;
  status: LucaLinkGuestSessionStatus;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  authenticatedAt?: number;
  disconnectedAt?: number;
  lastActivityAt?: number;

  messageCount: number;
  deniedCount: number;
  rateLimitedCount: number;

  capabilities: string[];
  warnings: string[];
  errors: string[];
}

export interface LucaLinkGuestInboundInput {
  kind: LucaLinkGuestInboundKind;
  sessionId?: string;
  payload?: unknown;
  message?: string;
  now?: number;
  requireAuthenticatedGuest?: boolean;
}

export interface LucaLinkGuestInboundResult {
  id: string;
  timestamp: number;
  kind: LucaLinkGuestInboundKind;
  sessionId?: string;

  decision: LucaLinkGuestInboundDecision;
  allowed: boolean;
  blocked: boolean;
  requiresAuth: boolean;
  rateLimited: boolean;
  sanitized: boolean;

  sanitizedMessage?: string;
  reason: string;
  warnings: string[];
  errors: string[];
  updatedSession?: LucaLinkGuestSessionRecord;
}

export interface LucaLinkGuestSessionPolicyOptions {
  now?: number;
  defaultTtlMs?: number;
  maxMessageLength?: number;
  maxMessagesPerMinute?: number;
  allowWebRtcSignaling?: boolean;
  allowGuestChat?: boolean;
}

export interface LucaLinkGuestSessionSummary {
  total: number;
  connected: number;
  authChallenge: number;
  authenticated: number;
  active: number;
  expired: number;
  revoked: number;
  disconnected: number;
  deniedGuestInbound: number;
  rateLimitedGuestInbound: number;
  lastGuestEventAt?: number;
  capabilities: string[];
  deniedCapabilities: string[];
  warnings: string[];
  errors: string[];
}

export const LUCA_LINK_GUEST_DEFAULT_TTL_MS = 30 * 60 * 1000;
export const LUCA_LINK_GUEST_DEFAULT_MAX_MESSAGE_LENGTH = 4000;
export const LUCA_LINK_GUEST_DEFAULT_MAX_MESSAGES_PER_MINUTE = 30;
export const LUCA_LINK_GUEST_CAPABILITIES = [
  "conversation",
  "presence",
  "webrtc-signaling",
  "auth-response",
] as const;
export const LUCA_LINK_GUEST_DENIED_CAPABILITIES = [
  "memory",
  "tool",
  "safety",
  "identity-full",
  "shell",
  "files",
  "code",
  "browser",
  "git",
  "payment",
  "robotics",
  "smart-home",
  "settings-sensitive",
] as const;

const KNOWN_INBOUND_KINDS = new Set<LucaLinkGuestInboundKind>([
  "guest-connected",
  "guest-disconnected",
  "guest-message",
  "guest-auth-response",
  "desktop-to-guest",
  "webrtc-offer",
  "webrtc-answer",
  "webrtc-ice-candidate",
  "unknown",
]);

const WEBRTC_KINDS = new Set<LucaLinkGuestInboundKind>([
  "webrtc-offer",
  "webrtc-answer",
  "webrtc-ice-candidate",
]);

const SAFE_OBSERVE_KINDS = new Set<LucaLinkGuestInboundKind>([
  "guest-connected",
  "guest-disconnected",
  "desktop-to-guest",
]);

function optionsWithDefaults(
  options: LucaLinkGuestSessionPolicyOptions = {},
): Required<LucaLinkGuestSessionPolicyOptions> {
  return {
    now: options.now ?? Date.now(),
    defaultTtlMs: options.defaultTtlMs ?? LUCA_LINK_GUEST_DEFAULT_TTL_MS,
    maxMessageLength:
      options.maxMessageLength ?? LUCA_LINK_GUEST_DEFAULT_MAX_MESSAGE_LENGTH,
    maxMessagesPerMinute:
      options.maxMessagesPerMinute ??
      LUCA_LINK_GUEST_DEFAULT_MAX_MESSAGES_PER_MINUTE,
    allowWebRtcSignaling: options.allowWebRtcSignaling ?? true,
    allowGuestChat: options.allowGuestChat ?? true,
  };
}

function resultId(kind: LucaLinkGuestInboundKind, timestamp: number): string {
  return `guest-inbound-${kind}-${timestamp}`;
}

function withStatus(
  session: LucaLinkGuestSessionRecord,
  status: LucaLinkGuestSessionStatus,
  options: LucaLinkGuestSessionPolicyOptions = {},
  extra: Partial<LucaLinkGuestSessionRecord> = {},
): LucaLinkGuestSessionRecord {
  const resolved = optionsWithDefaults(options);
  return {
    ...session,
    ...extra,
    status,
    updatedAt: resolved.now,
    lastActivityAt: resolved.now,
  };
}

function textFromPayload(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function containsPattern(value: string, patterns: ReadonlyArray<RegExp>): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

export function createLucaLinkGuestSession(
  sessionId: string,
  options: LucaLinkGuestSessionPolicyOptions = {},
): LucaLinkGuestSessionRecord {
  const resolved = optionsWithDefaults(options);
  return {
    sessionId,
    status: "connected",
    createdAt: resolved.now,
    updatedAt: resolved.now,
    expiresAt: resolved.now + resolved.defaultTtlMs,
    lastActivityAt: resolved.now,
    messageCount: 0,
    deniedCount: 0,
    rateLimitedCount: 0,
    capabilities: [...LUCA_LINK_GUEST_CAPABILITIES],
    warnings: [],
    errors: [],
  };
}

export function markGuestSessionAuthChallenge(
  session: LucaLinkGuestSessionRecord,
  options: LucaLinkGuestSessionPolicyOptions = {},
): LucaLinkGuestSessionRecord {
  return withStatus(session, "auth-challenge", options);
}

export function markGuestSessionAuthenticated(
  session: LucaLinkGuestSessionRecord,
  options: LucaLinkGuestSessionPolicyOptions = {},
): LucaLinkGuestSessionRecord {
  const resolved = optionsWithDefaults(options);
  return withStatus(session, "authenticated", resolved, {
    authenticatedAt: resolved.now,
  });
}

export function markGuestSessionActive(
  session: LucaLinkGuestSessionRecord,
  options: LucaLinkGuestSessionPolicyOptions = {},
): LucaLinkGuestSessionRecord {
  return withStatus(session, "active", options);
}

export function markGuestSessionDisconnected(
  session: LucaLinkGuestSessionRecord,
  options: LucaLinkGuestSessionPolicyOptions = {},
): LucaLinkGuestSessionRecord {
  const resolved = optionsWithDefaults(options);
  return withStatus(session, "disconnected", resolved, {
    disconnectedAt: resolved.now,
  });
}

export function markGuestSessionExpired(
  session: LucaLinkGuestSessionRecord,
  options: LucaLinkGuestSessionPolicyOptions = {},
): LucaLinkGuestSessionRecord {
  return withStatus(session, "expired", options);
}

export function markGuestSessionRevoked(
  session: LucaLinkGuestSessionRecord,
  options: LucaLinkGuestSessionPolicyOptions = {},
): LucaLinkGuestSessionRecord {
  return withStatus(session, "revoked", options);
}

export function isLucaLinkGuestSessionExpired(
  session: LucaLinkGuestSessionRecord,
  now = Date.now(),
): boolean {
  return session.status === "expired" || now >= session.expiresAt;
}

export function summarizeLucaLinkGuestSessions(
  sessions: Iterable<LucaLinkGuestSessionRecord>,
  now = Date.now(),
): LucaLinkGuestSessionSummary {
  const summary: LucaLinkGuestSessionSummary = {
    total: 0,
    connected: 0,
    authChallenge: 0,
    authenticated: 0,
    active: 0,
    expired: 0,
    revoked: 0,
    disconnected: 0,
    deniedGuestInbound: 0,
    rateLimitedGuestInbound: 0,
    capabilities: [...LUCA_LINK_GUEST_CAPABILITIES],
    deniedCapabilities: [...LUCA_LINK_GUEST_DENIED_CAPABILITIES],
    warnings: [],
    errors: [],
  };

  for (const session of sessions) {
    summary.total += 1;
    const expired = isLucaLinkGuestSessionExpired(session, now);
    if (expired) summary.expired += 1;
    else if (session.status === "auth-challenge") summary.authChallenge += 1;
    else if (session.status === "authenticated") summary.authenticated += 1;
    else if (session.status === "active") summary.active += 1;
    else if (session.status === "revoked") summary.revoked += 1;
    else if (session.status === "disconnected") summary.disconnected += 1;
    else summary.connected += 1;

    summary.deniedGuestInbound += session.deniedCount;
    summary.rateLimitedGuestInbound += session.rateLimitedCount;
    summary.warnings.push(...session.warnings);
    summary.errors.push(...session.errors);
    const lastEvent = session.lastActivityAt ?? session.updatedAt;
    if (!summary.lastGuestEventAt || lastEvent > summary.lastGuestEventAt) {
      summary.lastGuestEventAt = lastEvent;
    }
  }

  return summary;
}

export function classifyLucaLinkGuestInbound(
  input: LucaLinkGuestInboundInput,
): LucaLinkGuestInboundKind {
  if (KNOWN_INBOUND_KINDS.has(input.kind)) return input.kind;
  return "unknown";
}

export function isGuestWebRtcSignaling(kind: LucaLinkGuestInboundKind): boolean {
  return WEBRTC_KINDS.has(kind);
}

export function isGuestAuthPayload(payloadOrMessage: unknown): boolean {
  const text = textFromPayload(payloadOrMessage).trim();
  if (!text) return false;

  try {
    const parsed = JSON.parse(text);
    return (
      !!parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      (parsed as { type?: unknown }).type === "auth-response"
    );
  } catch {
    return /\bauth-response\b/i.test(text);
  }
}

export function sanitizeLucaLinkGuestMessage(
  message: string,
  options: LucaLinkGuestSessionPolicyOptions = {},
): string {
  const resolved = optionsWithDefaults(options);
  const withoutControls = message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  return withoutControls.slice(0, resolved.maxMessageLength);
}

const DANGEROUS_PATTERNS: ReadonlyArray<RegExp> = [
  /\b(?:access|read|write|dump|export|erase|change|mutate)\b.{0,80}\b(?:luca(?:os)?\s+)?memory\b/i,
  /\b(?:run|execute|invoke|call|use|start)\b.{0,80}\b(?:tool|shell|terminal|command|cmd|powershell|bash)\b/i,
  /\b(?:shell|terminal|bash|powershell|cmd)\b.{0,80}\b(?:run|execute|command|access)\b/i,
  /\b(?:read|write|open|delete|modify|create|overwrite)\b.{0,80}\b(?:file|folder|filesystem|directory|disk)\b/i,
  /\b(?:modify|edit|patch|rewrite|commit|change)\b.{0,80}\b(?:source\s+)?code\b/i,
  /\b(?:create|open|merge|approve|submit)\b.{0,80}\b(?:git\s+)?(?:pull request|pr)\b/i,
  /\b(?:control|drive|operate|open|navigate|click|automate)\b.{0,80}\bbrowser\b/i,
  /\b(?:spend|pay|purchase|buy|send)\b.{0,80}\b(?:money|payment|usd|dollars?|crypto|bitcoin|card)\b/i,
  /\b(?:control|move|drive|operate|actuate|unlock|lock|open)\b.{0,80}\b(?:robot|drone|vehicle|door|smart\s*home|light|thermostat|physical)\b/i,
  /\b(?:override|disable|bypass|ignore)\b.{0,80}\b(?:safety|guardrail|policy|restriction)\b/i,
  /\b(?:escalate|promote|grant|make|set)\b.{0,80}\b(?:owner|admin|primary\s+host|trust|identity)\b/i,
  /\b(?:i\s+am|as|claiming\s+to\s+be)\b.{0,40}\b(?:primary\s+host|owner|admin)\b/i,
  /\b(?:approve|authorize)\b.{0,80}\b(?:as\s+)?primary\s+host\b/i,
  /\b(?:spoof|forge|fake)\b.{0,80}\b(?:approval|authorization|identity|trust)\b/i,
  /\b(?:bypass|skip|ignore|disable|break)\b.{0,80}\b(?:pin|auth|authentication|login)\b/i,
  /\b(?:mutate|edit|change|grant|revoke)\b.{0,80}\b(?:trust|device\s+settings|guest\s+permissions|permissions)\b/i,
];

export function isDangerousGuestPayload(payloadOrMessage: unknown): boolean {
  const text = textFromPayload(payloadOrMessage);
  if (!text) return false;
  return containsPattern(text, DANGEROUS_PATTERNS);
}

function makeResult(
  input: LucaLinkGuestInboundInput,
  decision: LucaLinkGuestInboundDecision,
  reason: string,
  options: LucaLinkGuestSessionPolicyOptions,
  extra: Partial<LucaLinkGuestInboundResult> = {},
): LucaLinkGuestInboundResult {
  const resolved = optionsWithDefaults(options);
  const blocked = decision === "deny" || decision === "rate-limit" || decision === "invalid";
  return {
    id: resultId(input.kind, resolved.now),
    timestamp: resolved.now,
    kind: classifyLucaLinkGuestInbound(input),
    sessionId: input.sessionId,
    decision,
    allowed: !blocked && decision !== "require-auth",
    blocked,
    requiresAuth: decision === "require-auth",
    rateLimited: decision === "rate-limit",
    sanitized: decision === "sanitize",
    reason,
    warnings: [],
    errors: [],
    ...extra,
  };
}

export function evaluateLucaLinkGuestInbound(
  input: LucaLinkGuestInboundInput,
  session?: LucaLinkGuestSessionRecord,
  options: LucaLinkGuestSessionPolicyOptions = {},
): LucaLinkGuestInboundResult {
  const kind = classifyLucaLinkGuestInbound(input);
  const resolved = optionsWithDefaults({ ...options, now: input.now ?? options.now });
  const policyOptions = { ...resolved, now: resolved.now };
  const message = input.message ?? (typeof input.payload === "string" ? input.payload : undefined);
  let updatedSession = session;

  const incrementSession = (
    changes: Partial<LucaLinkGuestSessionRecord>,
  ): LucaLinkGuestSessionRecord | undefined => {
    if (!updatedSession) return undefined;
    updatedSession = {
      ...updatedSession,
      ...changes,
      updatedAt: resolved.now,
      lastActivityAt: resolved.now,
    };
    return updatedSession;
  };

  if (kind === "unknown") {
    return makeResult(input, "invalid", "unknown-guest-inbound-kind", policyOptions, {
      errors: ["Unknown guest inbound event kind."],
      updatedSession: incrementSession({
        errors: [...(updatedSession?.errors ?? []), "Unknown guest inbound event kind."],
      }),
    });
  }

  if (session && isLucaLinkGuestSessionExpired(session, resolved.now)) {
    updatedSession = markGuestSessionExpired(session, policyOptions);
    return makeResult(input, "require-auth", "guest-session-expired", policyOptions, {
      updatedSession,
    });
  }

  if (SAFE_OBSERVE_KINDS.has(kind)) {
    return makeResult(input, "allow", `${kind}-allowed`, policyOptions, {
      updatedSession: incrementSession({}),
    });
  }

  if (isGuestWebRtcSignaling(kind)) {
    if (!resolved.allowWebRtcSignaling) {
      return makeResult(input, "deny", "webrtc-signaling-disabled", policyOptions, {
        updatedSession: incrementSession({
          deniedCount: (updatedSession?.deniedCount ?? 0) + 1,
        }),
      });
    }
    return makeResult(input, "allow", "webrtc-signaling-preserved", policyOptions, {
      updatedSession: incrementSession({}),
    });
  }

  if (kind === "guest-auth-response" || isGuestAuthPayload(message ?? input.payload)) {
    return makeResult(input, "allow", "guest-auth-response-preserved", policyOptions, {
      updatedSession: incrementSession({}),
    });
  }

  if (kind !== "guest-message") {
    return makeResult(input, "observe-only", "guest-inbound-observed", policyOptions, {
      updatedSession: incrementSession({}),
    });
  }

  if (!resolved.allowGuestChat) {
    return makeResult(input, "deny", "guest-chat-disabled", policyOptions, {
      updatedSession: incrementSession({
        deniedCount: (updatedSession?.deniedCount ?? 0) + 1,
      }),
    });
  }

  if (
    input.requireAuthenticatedGuest &&
    (!session || (session.status !== "authenticated" && session.status !== "active"))
  ) {
    return makeResult(input, "require-auth", "guest-message-requires-auth", policyOptions, {
      updatedSession: incrementSession({}),
    });
  }

  if (isDangerousGuestPayload(message ?? input.payload)) {
    return makeResult(input, "deny", "dangerous-guest-authority-request", policyOptions, {
      updatedSession: incrementSession({
        deniedCount: (updatedSession?.deniedCount ?? 0) + 1,
      }),
    });
  }

  if (
    session &&
    session.messageCount >= resolved.maxMessagesPerMinute &&
    (session.lastActivityAt ?? session.updatedAt) > resolved.now - 60_000
  ) {
    return makeResult(input, "rate-limit", "guest-message-rate-limit", policyOptions, {
      updatedSession: incrementSession({
        rateLimitedCount: (updatedSession?.rateLimitedCount ?? 0) + 1,
      }),
    });
  }

  const rawMessage = message ?? textFromPayload(input.payload);
  const sanitizedMessage = sanitizeLucaLinkGuestMessage(rawMessage, policyOptions);
  const nextMessageCount = (updatedSession?.messageCount ?? 0) + 1;
  const nextSession = incrementSession({ messageCount: nextMessageCount });

  if (sanitizedMessage !== rawMessage) {
    return makeResult(input, "sanitize", "guest-message-sanitized", policyOptions, {
      sanitizedMessage,
      warnings: ["Guest message was sanitized before chat handling."],
      updatedSession: nextSession,
    });
  }

  return makeResult(input, "allow", "guest-message-allowed", policyOptions, {
    sanitizedMessage,
    updatedSession: nextSession,
  });
}
