/** Pure, transport-neutral authorization rules for inbound LucaLink traffic. */

export type LucaLinkInboundTrust =
  | "unknown"
  | "guest"
  | "paired"
  | "trusted"
  | "admin"
  | "owner";

export interface LucaLinkInboundAuthorizationInput {
  sourceId?: string;
  targetId?: string;
  localDeviceId?: string | null;
  sourceKnown: boolean;
  sourceActive: boolean;
  sourceTrust: LucaLinkInboundTrust;
  requiresTrustedSource?: boolean;
  requiresPinnedIdentity?: boolean;
  hasPinnedIdentity?: boolean;
  requiresAuthenticatedSession?: boolean;
  hasAuthenticatedSession?: boolean;
  messageId?: string;
  timestamp?: number;
  now?: number;
  maxAgeMs?: number;
  futureSkewMs?: number;
  replayed?: boolean;
  allowBroadcast?: boolean;
}

export interface LucaLinkInboundAuthorizationDecision {
  allowed: boolean;
  code:
    | "allowed"
    | "missing-source"
    | "unknown-source"
    | "inactive-source"
    | "misaddressed"
    | "insufficient-trust"
    | "unpinned-identity"
    | "unauthenticated-session"
    | "missing-message-id"
    | "invalid-timestamp"
    | "replayed";
  reason: string;
}

const deny = (
  code: Exclude<LucaLinkInboundAuthorizationDecision["code"], "allowed">,
  reason: string,
): LucaLinkInboundAuthorizationDecision => ({ allowed: false, code, reason });

export function authorizeLucaLinkInbound(
  input: LucaLinkInboundAuthorizationInput,
): LucaLinkInboundAuthorizationDecision {
  if (!input.sourceId) return deny("missing-source", "Missing source device identity.");
  if (!input.sourceKnown) return deny("unknown-source", "Source device is unknown.");
  if (!input.sourceActive) return deny("inactive-source", "Source device is inactive, revoked, or blocked.");

  if (
    input.targetId &&
    input.localDeviceId &&
    input.targetId !== input.localDeviceId &&
    !(input.allowBroadcast && input.targetId === "all")
  ) {
    return deny("misaddressed", "Message target does not match this host.");
  }

  if (
    input.requiresTrustedSource &&
    !["trusted", "admin", "owner"].includes(input.sourceTrust)
  ) {
    return deny("insufficient-trust", "Sensitive inbound traffic requires a trusted host.");
  }

  if (input.requiresPinnedIdentity && !input.hasPinnedIdentity) {
    return deny("unpinned-identity", "Source device has no pinned identity key.");
  }

  if (input.requiresAuthenticatedSession && !input.hasAuthenticatedSession) {
    return deny("unauthenticated-session", "Sensitive inbound traffic requires an authenticated secure session.");
  }

  if (input.maxAgeMs !== undefined || input.futureSkewMs !== undefined) {
    if (!input.messageId) return deny("missing-message-id", "Message has no replay-protection identifier.");
    const now = input.now ?? Date.now();
    const maxAgeMs = input.maxAgeMs ?? 0;
    const futureSkewMs = input.futureSkewMs ?? 0;
    if (
      !Number.isFinite(input.timestamp) ||
      input.timestamp! < now - maxAgeMs ||
      input.timestamp! > now + futureSkewMs
    ) {
      return deny("invalid-timestamp", "Message timestamp is stale, invalid, or too far in the future.");
    }
    if (input.replayed) return deny("replayed", "Message identifier has already been accepted.");
  }

  return { allowed: true, code: "allowed", reason: "Inbound policy requirements satisfied." };
}
