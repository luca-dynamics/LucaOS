export const LUCA_LINK_TRANSPORT_CHANNELS = [
  "local_only",
  "manual_pairing",
  "qr_pairing",
  "lan",
  "relay",
  "webrtc",
  "vpn",
  "guest_relay",
  "future_transport",
] as const;

export type LucaLinkTransportChannel =
  (typeof LUCA_LINK_TRANSPORT_CHANNELS)[number];

export const LUCA_LINK_MESSAGE_CLASSES = [
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
  "guest_message",
  "mission_sync",
  "bounded_handoff_preview",
  "debug_diagnostic",
  "blocked_sensitive_payload",
] as const;

export type LucaLinkMessageClass = (typeof LUCA_LINK_MESSAGE_CLASSES)[number];
export type LucaLinkTransportRiskLevel = "low" | "medium" | "high" | "critical";
export type LucaLinkTransportTrustLevel =
  | "untrusted"
  | "guest"
  | "paired"
  | "trusted"
  | "primary";
export type LucaLinkTransportSessionKind =
  | "primary"
  | "companion"
  | "display"
  | "guest"
  | "sensor"
  | "adapter"
  | "diagnostic";
export type LucaLinkTransportPrivacyLevel =
  | "public"
  | "project"
  | "private"
  | "sensitive";

export interface LucaLinkTransportPermissionRequest {
  requestId: string;
  createdAt: string;
  requestedByHostId: string;
  targetHostId?: string;
  channel: LucaLinkTransportChannel;
  messageClass: LucaLinkMessageClass;
  riskLevel: LucaLinkTransportRiskLevel;
  trustLevel: LucaLinkTransportTrustLevel;
  sessionKind: LucaLinkTransportSessionKind;
  requiresApproval: boolean;
  approvalSatisfied: boolean;
  payloadSummary: string;
  privacyLevel: LucaLinkTransportPrivacyLevel;
  expiresAt: string;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export type LucaLinkTransportPermissionDecisionStatus =
  | "allowed_preview"
  | "approval_required"
  | "blocked"
  | "expired"
  | "unsupported";

export interface LucaLinkTransportPermissionDecision {
  decisionId: string;
  requestId: string;
  status: LucaLinkTransportPermissionDecisionStatus;
  allowedChannel?: LucaLinkTransportChannel;
  allowedMessageClass?: LucaLinkMessageClass;
  requiredApprovals: string[];
  requiredTrustLevel: LucaLinkTransportTrustLevel;
  requiredSessionKind?: LucaLinkTransportSessionKind;
  reason: string;
  warnings: string[];
  blockers: string[];
  sideEffectsPerformed: false;
}

export interface LucaLinkTransportPermissionEvaluationOptions {
  now?: string | Date;
  explicitApprovalMetadata?: boolean;
}
