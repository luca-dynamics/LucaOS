import type {
  LucaLinkMessageClass,
  LucaLinkTransportChannel,
  LucaLinkTransportRiskLevel,
  LucaLinkTransportSessionKind,
  LucaLinkTransportTrustLevel,
} from "./transportPermissionTypes";

export interface LucaLinkTransportChannelPolicy {
  channel: LucaLinkTransportChannel;
  supportedForPolicyPreview: boolean;
  liveTransportEnabled: false;
  allowedMessageClasses: readonly LucaLinkMessageClass[];
  minimumTrustLevel: LucaLinkTransportTrustLevel;
  requiredSessionKind?: LucaLinkTransportSessionKind;
  approvalRequiredAtOrAbove?: LucaLinkTransportRiskLevel;
  pairingMetadataOnly: boolean;
  sensitivePayloadsAllowed: false;
  summary: string;
  warnings: readonly string[];
}

const LOCAL_PREVIEW_MESSAGES: readonly LucaLinkMessageClass[] = [
  "heartbeat",
  "host_status",
  "approval_notification",
  "display_intent",
  "display_preview",
  "sensor_snapshot",
  "adapter_plan",
  "adapter_permission_request",
  "mission_sync",
  "bounded_handoff_preview",
  "debug_diagnostic",
];
const PAIRED_MESSAGES: readonly LucaLinkMessageClass[] = [
  "heartbeat",
  "host_status",
  "pairing_request",
  "pairing_response",
  "approval_notification",
  "approval_decision_intent",
  "display_intent",
  "display_preview",
  "sensor_snapshot",
  "adapter_plan",
  "adapter_permission_request",
  "mission_sync",
  "bounded_handoff_preview",
];

const POLICIES: Record<
  LucaLinkTransportChannel,
  LucaLinkTransportChannelPolicy
> = {
  local_only: {
    channel: "local_only",
    supportedForPolicyPreview: true,
    liveTransportEnabled: false,
    allowedMessageClasses: LOCAL_PREVIEW_MESSAGES,
    minimumTrustLevel: "untrusted",
    pairingMetadataOnly: false,
    sensitivePayloadsAllowed: false,
    summary: "Safe local fixtures and previews only; no network transport.",
    warnings: [],
  },
  manual_pairing: {
    channel: "manual_pairing",
    supportedForPolicyPreview: true,
    liveTransportEnabled: false,
    allowedMessageClasses: ["pairing_request", "pairing_response"],
    minimumTrustLevel: "untrusted",
    pairingMetadataOnly: true,
    sensitivePayloadsAllowed: false,
    summary: "User-visible manual pairing metadata only.",
    warnings: ["No pairing lifecycle mutation is authorized."],
  },
  qr_pairing: {
    channel: "qr_pairing",
    supportedForPolicyPreview: true,
    liveTransportEnabled: false,
    allowedMessageClasses: ["pairing_request", "pairing_response"],
    minimumTrustLevel: "untrusted",
    pairingMetadataOnly: true,
    sensitivePayloadsAllowed: false,
    summary: "User-visible QR pairing metadata only.",
    warnings: ["No QR or pairing lifecycle mutation is authorized."],
  },
  lan: {
    channel: "lan",
    supportedForPolicyPreview: true,
    liveTransportEnabled: false,
    allowedMessageClasses: PAIRED_MESSAGES,
    minimumTrustLevel: "paired",
    pairingMetadataOnly: false,
    sensitivePayloadsAllowed: false,
    summary:
      "Paired or trusted hosts may receive policy previews; sensitive payloads remain blocked.",
    warnings: [],
  },
  relay: {
    channel: "relay",
    supportedForPolicyPreview: true,
    liveTransportEnabled: false,
    allowedMessageClasses: PAIRED_MESSAGES,
    minimumTrustLevel: "paired",
    approvalRequiredAtOrAbove: "medium",
    pairingMetadataOnly: false,
    sensitivePayloadsAllowed: false,
    summary:
      "Paired or trusted hosts only; medium and higher risk requires approval.",
    warnings: [],
  },
  webrtc: {
    channel: "webrtc",
    supportedForPolicyPreview: false,
    liveTransportEnabled: false,
    allowedMessageClasses: [],
    minimumTrustLevel: "trusted",
    approvalRequiredAtOrAbove: "low",
    pairingMetadataOnly: false,
    sensitivePayloadsAllowed: false,
    summary:
      "Future gated channel; unavailable for transport permission in this PR.",
    warnings: ["WebRTC live enablement is out of scope."],
  },
  vpn: {
    channel: "vpn",
    supportedForPolicyPreview: false,
    liveTransportEnabled: false,
    allowedMessageClasses: [],
    minimumTrustLevel: "primary",
    approvalRequiredAtOrAbove: "low",
    pairingMetadataOnly: false,
    sensitivePayloadsAllowed: false,
    summary:
      "Future high-trust gated channel; unavailable for transport permission in this PR.",
    warnings: ["VPN live enablement is out of scope."],
  },
  guest_relay: {
    channel: "guest_relay",
    supportedForPolicyPreview: true,
    liveTransportEnabled: false,
    allowedMessageClasses: ["guest_message"],
    minimumTrustLevel: "guest",
    requiredSessionKind: "guest",
    pairingMetadataOnly: false,
    sensitivePayloadsAllowed: false,
    summary: "Guest-session-scoped, low-risk messages only.",
    warnings: [],
  },
  future_transport: {
    channel: "future_transport",
    supportedForPolicyPreview: false,
    liveTransportEnabled: false,
    allowedMessageClasses: [],
    minimumTrustLevel: "primary",
    pairingMetadataOnly: false,
    sensitivePayloadsAllowed: false,
    summary: "Unsupported and blocked by default.",
    warnings: ["A separately reviewed channel policy is required."],
  },
};

export function getLucaLinkTransportChannelPolicy(
  channel: LucaLinkTransportChannel,
): LucaLinkTransportChannelPolicy {
  return POLICIES[channel];
}
