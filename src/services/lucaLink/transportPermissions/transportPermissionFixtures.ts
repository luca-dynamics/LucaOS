import {
  createTransportPermissionDecision,
  createTransportPermissionRequest,
} from "./transportPermissionDecision";
import type { LucaLinkTransportPermissionRequestInput } from "./transportPermissionDecision";

export const LUCA_LINK_TRANSPORT_FIXTURE_NOW = "2026-06-07T12:00:00.000Z";
const CREATED = "2026-06-07T11:55:00.000Z";
const EXPIRES = "2026-06-07T12:30:00.000Z";

function fixture(
  requestId: string,
  input: Partial<LucaLinkTransportPermissionRequestInput> &
    Pick<
      LucaLinkTransportPermissionRequestInput,
      "channel" | "messageClass" | "payloadSummary"
    >,
) {
  return createTransportPermissionRequest({
    requestId,
    createdAt: CREATED,
    requestedByHostId: "fixture-primary-host",
    targetHostId: "fixture-target-host",
    riskLevel: "low",
    trustLevel: "primary",
    sessionKind: "primary",
    requiresApproval: false,
    approvalSatisfied: false,
    privacyLevel: "project",
    expiresAt: EXPIRES,
    ...input,
  });
}

export const LUCA_LINK_LOCAL_HOST_STATUS_TRANSPORT_FIXTURE = fixture(
  "local-host-status",
  {
    channel: "local_only",
    messageClass: "host_status",
    payloadSummary: "Local host is available for policy preview.",
  },
);
export const LUCA_LINK_LAN_HEARTBEAT_TRANSPORT_FIXTURE = fixture(
  "lan-heartbeat",
  {
    channel: "lan",
    messageClass: "heartbeat",
    trustLevel: "paired",
    payloadSummary: "Paired host heartbeat metadata.",
  },
);
export const LUCA_LINK_RELAY_APPROVAL_NOTIFICATION_TRANSPORT_FIXTURE = fixture(
  "relay-approval-notification",
  {
    channel: "relay",
    messageClass: "approval_notification",
    trustLevel: "trusted",
    sessionKind: "companion",
    payloadSummary: "Read-only companion approval notification.",
  },
);
export const LUCA_LINK_DISPLAY_INTENT_TRANSPORT_FIXTURE = fixture(
  "display-intent",
  {
    channel: "relay",
    messageClass: "display_intent",
    trustLevel: "trusted",
    sessionKind: "display",
    riskLevel: "medium",
    requiresApproval: true,
    payloadSummary: "Display a sanitized project dashboard preview.",
  },
);
export const LUCA_LINK_SENSOR_SNAPSHOT_TRANSPORT_FIXTURE = fixture(
  "sensor-snapshot",
  {
    channel: "local_only",
    messageClass: "sensor_snapshot",
    trustLevel: "paired",
    sessionKind: "sensor",
    payloadSummary: "Read-only battery and host health metadata.",
  },
);
export const LUCA_LINK_LOW_RISK_GUEST_MESSAGE_TRANSPORT_FIXTURE = fixture(
  "guest-message-low",
  {
    channel: "guest_relay",
    messageClass: "guest_message",
    trustLevel: "guest",
    sessionKind: "guest",
    privacyLevel: "public",
    payloadSummary: "Low-risk guest session greeting.",
  },
);
export const LUCA_LINK_HIGH_RISK_GUEST_MESSAGE_TRANSPORT_FIXTURE = fixture(
  "guest-message-high",
  {
    channel: "guest_relay",
    messageClass: "guest_message",
    trustLevel: "guest",
    sessionKind: "guest",
    riskLevel: "high",
    payloadSummary: "High-risk guest request that policy must block.",
  },
);
export const LUCA_LINK_BLOCKED_MISSION_SYNC_TRANSPORT_FIXTURE = fixture(
  "mission-sync-private",
  {
    channel: "relay",
    messageClass: "mission_sync",
    trustLevel: "trusted",
    sessionKind: "primary",
    riskLevel: "medium",
    requiresApproval: true,
    privacyLevel: "private",
    payloadSummary: "Mission sync includes raw content and private reasoning.",
  },
);
export const LUCA_LINK_BOUNDED_HANDOFF_TRANSPORT_FIXTURE = fixture(
  "bounded-handoff",
  {
    channel: "lan",
    messageClass: "bounded_handoff_preview",
    trustLevel: "trusted",
    sessionKind: "companion",
    riskLevel: "medium",
    requiresApproval: true,
    payloadSummary: "Redacted, bounded, expiring handoff preview.",
  },
);
export const LUCA_LINK_WEBRTC_FUTURE_TRANSPORT_FIXTURE = fixture(
  "future-webrtc",
  {
    channel: "webrtc",
    messageClass: "display_preview",
    trustLevel: "trusted",
    sessionKind: "display",
    requiresApproval: true,
    payloadSummary: "Future WebRTC display preview request.",
  },
);
export const LUCA_LINK_VPN_FUTURE_TRANSPORT_FIXTURE = fixture("future-vpn", {
  channel: "vpn",
  messageClass: "mission_sync",
  trustLevel: "primary",
  riskLevel: "high",
  requiresApproval: true,
  payloadSummary: "Future VPN mission metadata request.",
});
export const LUCA_LINK_BLOCKED_SENSITIVE_PAYLOAD_TRANSPORT_FIXTURE = fixture(
  "blocked-sensitive",
  {
    channel: "local_only",
    messageClass: "blocked_sensitive_payload",
    riskLevel: "critical",
    privacyLevel: "sensitive",
    payloadSummary: "Blocked sensitive payload fixture with no real data.",
  },
);

export const LUCA_LINK_TRANSPORT_PERMISSION_FIXTURES = Object.freeze([
  LUCA_LINK_LOCAL_HOST_STATUS_TRANSPORT_FIXTURE,
  LUCA_LINK_LAN_HEARTBEAT_TRANSPORT_FIXTURE,
  LUCA_LINK_RELAY_APPROVAL_NOTIFICATION_TRANSPORT_FIXTURE,
  LUCA_LINK_DISPLAY_INTENT_TRANSPORT_FIXTURE,
  LUCA_LINK_SENSOR_SNAPSHOT_TRANSPORT_FIXTURE,
  LUCA_LINK_LOW_RISK_GUEST_MESSAGE_TRANSPORT_FIXTURE,
  LUCA_LINK_HIGH_RISK_GUEST_MESSAGE_TRANSPORT_FIXTURE,
  LUCA_LINK_BLOCKED_MISSION_SYNC_TRANSPORT_FIXTURE,
  LUCA_LINK_BOUNDED_HANDOFF_TRANSPORT_FIXTURE,
  LUCA_LINK_WEBRTC_FUTURE_TRANSPORT_FIXTURE,
  LUCA_LINK_VPN_FUTURE_TRANSPORT_FIXTURE,
  LUCA_LINK_BLOCKED_SENSITIVE_PAYLOAD_TRANSPORT_FIXTURE,
]);

export const LUCA_LINK_TRANSPORT_PERMISSION_FIXTURE_DECISIONS = Object.freeze(
  LUCA_LINK_TRANSPORT_PERMISSION_FIXTURES.map((request) =>
    createTransportPermissionDecision(request, {
      now: LUCA_LINK_TRANSPORT_FIXTURE_NOW,
    }),
  ),
);
