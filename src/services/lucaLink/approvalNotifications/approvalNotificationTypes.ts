import type {
  LucaLinkApprovalRisk,
  LucaLinkApprovalSource,
} from "../lucaLinkApprovalQueue";
import type {
  LucaLinkApprovalSurfaceDecision,
  LucaLinkApprovalSurfaceEvaluation,
} from "../lucaLinkMultiHostApproval";

export type LucaLinkApprovalNotificationSource =
  | LucaLinkApprovalSource
  | "web-display-bridge";

export type LucaLinkApprovalNotificationStatus =
  | "unread"
  | "viewed"
  | "action_required"
  | "approved_intent"
  | "denied_intent"
  | "escalated"
  | "expired"
  | "blocked";

export const LUCA_LINK_APPROVAL_NOTIFICATION_ACTIONS = [
  "view",
  "dismiss",
  "deny_intent",
  "approve_preview_intent",
  "escalate_primary_host",
] as const;

export type LucaLinkApprovalNotificationAction =
  (typeof LUCA_LINK_APPROVAL_NOTIFICATION_ACTIONS)[number];

export const LUCA_LINK_APPROVAL_NOTIFICATION_BLOCKED_ACTIONS = [
  "execute",
  "send_socket",
  "cast",
  "open_browser",
  "control_browser",
  "dom_execute",
  "credential_injection",
  "file_write",
  "install",
  "network_mutate",
  "device_control",
  "payment",
  "physical_action",
] as const;

export type LucaLinkApprovalNotificationBlockedAction =
  (typeof LUCA_LINK_APPROVAL_NOTIFICATION_BLOCKED_ACTIONS)[number];

export interface LucaLinkApprovalNotification {
  notificationId: string;
  requestId: string;
  source: LucaLinkApprovalNotificationSource;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  status: LucaLinkApprovalNotificationStatus;
  requestedByDeviceId?: string;
  targetHostId?: string;
  targetSurfaceId?: string;
  title: string;
  summary: string;
  reason: string;
  risk: LucaLinkApprovalRisk;
  permission?: string;
  eventName?: string;
  payloadPreview?: unknown;
  surfaceDecision: LucaLinkApprovalSurfaceDecision;
  surfaceEligible: boolean;
  requiresFreshPrimaryHostConfirmation: boolean;
  allowedNotificationActions: LucaLinkApprovalNotificationAction[];
  blockedActions: LucaLinkApprovalNotificationBlockedAction[];
  warnings: string[];
  errors: string[];
  sideEffectsPerformed: false;
}

export interface LucaLinkApprovalNotificationPolicyResult {
  status: LucaLinkApprovalNotificationStatus;
  surfaceEvaluation: LucaLinkApprovalSurfaceEvaluation;
  allowedNotificationActions: LucaLinkApprovalNotificationAction[];
  blockedActions: LucaLinkApprovalNotificationBlockedAction[];
  warnings: string[];
  errors: string[];
  sideEffectsPerformed: false;
}

export type LucaLinkApprovalNotificationDecision =
  | "approve_preview_intent"
  | "deny_intent"
  | "escalate_primary_host"
  | "dismiss";

export interface LucaLinkApprovalNotificationDecisionIntent {
  intentId: string;
  notificationId: string;
  requestId: string;
  decision: LucaLinkApprovalNotificationDecision;
  decidedBySurfaceId: string;
  decidedByHostId: string;
  createdAt: number;
  reason?: string;
  requiresPrimaryHostFinalization: boolean;
  sideEffectsPerformed: false;
  warnings: string[];
  errors: string[];
}
