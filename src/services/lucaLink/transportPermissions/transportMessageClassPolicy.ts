import type {
  LucaLinkMessageClass,
  LucaLinkTransportChannel,
  LucaLinkTransportRiskLevel,
  LucaLinkTransportSessionKind,
  LucaLinkTransportTrustLevel,
} from "./transportPermissionTypes";

export interface LucaLinkMessageClassPolicy {
  messageClass: LucaLinkMessageClass;
  allowedChannels: readonly LucaLinkTransportChannel[];
  minimumTrustLevel: LucaLinkTransportTrustLevel;
  requiredSessionKind?: LucaLinkTransportSessionKind;
  minimumRiskLevel: LucaLinkTransportRiskLevel;
  approvalRequired: boolean;
  alwaysBlocked: boolean;
  summary: string;
}

const paired = ["lan", "relay"] as const;
const policies: Record<LucaLinkMessageClass, LucaLinkMessageClassPolicy> = {
  heartbeat: {
    messageClass: "heartbeat",
    allowedChannels: ["local_only", ...paired],
    minimumTrustLevel: "untrusted",
    minimumRiskLevel: "low",
    approvalRequired: false,
    alwaysBlocked: false,
    summary: "Low-risk liveness metadata only.",
  },
  host_status: {
    messageClass: "host_status",
    allowedChannels: ["local_only", ...paired],
    minimumTrustLevel: "untrusted",
    minimumRiskLevel: "low",
    approvalRequired: false,
    alwaysBlocked: false,
    summary: "Low-risk host status metadata only.",
  },
  pairing_request: {
    messageClass: "pairing_request",
    allowedChannels: ["manual_pairing", "qr_pairing", ...paired],
    minimumTrustLevel: "untrusted",
    minimumRiskLevel: "low",
    approvalRequired: true,
    alwaysBlocked: false,
    summary: "Visible pairing metadata without secrets.",
  },
  pairing_response: {
    messageClass: "pairing_response",
    allowedChannels: ["manual_pairing", "qr_pairing", ...paired],
    minimumTrustLevel: "untrusted",
    minimumRiskLevel: "low",
    approvalRequired: true,
    alwaysBlocked: false,
    summary: "Visible pairing metadata without secrets.",
  },
  approval_notification: {
    messageClass: "approval_notification",
    allowedChannels: ["local_only", ...paired],
    minimumTrustLevel: "trusted",
    minimumRiskLevel: "low",
    approvalRequired: false,
    alwaysBlocked: false,
    summary:
      "Read-only notification preview for trusted companion or display surfaces.",
  },
  approval_decision_intent: {
    messageClass: "approval_decision_intent",
    allowedChannels: paired,
    minimumTrustLevel: "trusted",
    requiredSessionKind: "companion",
    minimumRiskLevel: "medium",
    approvalRequired: true,
    alwaysBlocked: false,
    summary: "Explicit approval context required; never sent by this model.",
  },
  display_intent: {
    messageClass: "display_intent",
    allowedChannels: ["local_only", ...paired],
    minimumTrustLevel: "trusted",
    requiredSessionKind: "display",
    minimumRiskLevel: "medium",
    approvalRequired: true,
    alwaysBlocked: false,
    summary: "Display-only intent; no browser control.",
  },
  display_preview: {
    messageClass: "display_preview",
    allowedChannels: ["local_only", ...paired],
    minimumTrustLevel: "trusted",
    requiredSessionKind: "display",
    minimumRiskLevel: "low",
    approvalRequired: true,
    alwaysBlocked: false,
    summary: "Read-only display preview.",
  },
  sensor_snapshot: {
    messageClass: "sensor_snapshot",
    allowedChannels: ["local_only", ...paired],
    minimumTrustLevel: "paired",
    requiredSessionKind: "sensor",
    minimumRiskLevel: "low",
    approvalRequired: false,
    alwaysBlocked: false,
    summary: "Read-only sensor/status metadata; no collection.",
  },
  adapter_plan: {
    messageClass: "adapter_plan",
    allowedChannels: ["local_only", ...paired],
    minimumTrustLevel: "trusted",
    requiredSessionKind: "adapter",
    minimumRiskLevel: "medium",
    approvalRequired: true,
    alwaysBlocked: false,
    summary: "Adapter plan preview; no execution.",
  },
  adapter_permission_request: {
    messageClass: "adapter_permission_request",
    allowedChannels: ["local_only", ...paired],
    minimumTrustLevel: "trusted",
    requiredSessionKind: "adapter",
    minimumRiskLevel: "medium",
    approvalRequired: true,
    alwaysBlocked: false,
    summary: "Permission request preview; no execution.",
  },
  guest_message: {
    messageClass: "guest_message",
    allowedChannels: ["guest_relay"],
    minimumTrustLevel: "guest",
    requiredSessionKind: "guest",
    minimumRiskLevel: "low",
    approvalRequired: false,
    alwaysBlocked: false,
    summary: "Guest-scoped, low-risk message only.",
  },
  mission_sync: {
    messageClass: "mission_sync",
    allowedChannels: ["local_only", ...paired],
    minimumTrustLevel: "paired",
    requiredSessionKind: "primary",
    minimumRiskLevel: "medium",
    approvalRequired: true,
    alwaysBlocked: false,
    summary:
      "Redacted mission metadata only; no raw memory or private reasoning.",
  },
  bounded_handoff_preview: {
    messageClass: "bounded_handoff_preview",
    allowedChannels: ["local_only", ...paired],
    minimumTrustLevel: "trusted",
    requiredSessionKind: "companion",
    minimumRiskLevel: "medium",
    approvalRequired: true,
    alwaysBlocked: false,
    summary: "Explicitly approved, redacted, expiring preview only.",
  },
  debug_diagnostic: {
    messageClass: "debug_diagnostic",
    allowedChannels: ["local_only"],
    minimumTrustLevel: "untrusted",
    requiredSessionKind: "diagnostic",
    minimumRiskLevel: "low",
    approvalRequired: false,
    alwaysBlocked: false,
    summary: "Local-only diagnostic without secrets.",
  },
  blocked_sensitive_payload: {
    messageClass: "blocked_sensitive_payload",
    allowedChannels: [],
    minimumTrustLevel: "primary",
    minimumRiskLevel: "critical",
    approvalRequired: true,
    alwaysBlocked: true,
    summary: "Sensitive payloads are always blocked.",
  },
};

export function getLucaLinkMessageClassPolicy(
  messageClass: LucaLinkMessageClass,
): LucaLinkMessageClassPolicy {
  return policies[messageClass];
}
