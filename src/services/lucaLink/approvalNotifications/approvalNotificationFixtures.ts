import type { LucaLinkApprovalRequest } from "../lucaLinkApprovalQueue";
import type { LucaLinkApprovalSurfaceRecord } from "../lucaLinkMultiHostApproval";
import { createLucaLinkWebDisplaySessionIntent } from "../display/webDisplaySession";
import { createApprovalNotificationInbox } from "./approvalNotificationInbox";
import {
  createApprovalNotificationFromRequest,
  createApprovalNotificationFromWebDisplayIntent,
} from "./approvalNotificationSurface";

const FIXTURE_NOW = Date.UTC(2026, 5, 7, 12, 0, 0);
const FIXTURE_EXPIRY = FIXTURE_NOW + 5 * 60 * 1000;

function surface(
  input: Partial<LucaLinkApprovalSurfaceRecord> &
    Pick<
      LucaLinkApprovalSurfaceRecord,
      "id" | "hostId" | "surfaceKind" | "authority"
    >,
): LucaLinkApprovalSurfaceRecord {
  return {
    displayName: "Fixture approval surface",
    hostClass: "companion-host",
    connectionClass: "local",
    presenceCapability: "user-present-strong",
    approvalCapability: "low-medium-risk",
    trustLevel: "trusted",
    status: "connected",
    canDisplayApprovals: true,
    canDenyApprovals: true,
    canApproveLowRisk: true,
    canApproveMediumRisk: true,
    canApproveHighRisk: false,
    canApproveCriticalRisk: false,
    requiresPrimaryHostEscalation: false,
    publicSurface: false,
    userPresenceRequired: true,
    warnings: [],
    errors: [],
    ...input,
  };
}

function request(
  input: Partial<LucaLinkApprovalRequest> &
    Pick<LucaLinkApprovalRequest, "id" | "title">,
): LucaLinkApprovalRequest {
  return {
    status: "pending",
    source: "manual",
    createdAt: FIXTURE_NOW,
    updatedAt: FIXTURE_NOW,
    expiresAt: FIXTURE_EXPIRY,
    risk: "low",
    summary: "Safe fixture approval request.",
    reason: "Demonstrate intent-only approval notification rendering.",
    explain: "No action is sent or executed.",
    warnings: [],
    errors: [],
    ...input,
  };
}

export const LUCA_LINK_TRUSTED_COMPANION_APPROVAL_SURFACE = surface({
  id: "approval-surface-fixture-companion",
  hostId: "fixture-companion-host",
  surfaceKind: "trusted-companion",
  authority: "low-medium-risk-approve",
});

export const LUCA_LINK_DISPLAY_ONLY_APPROVAL_SURFACE = surface({
  id: "approval-surface-fixture-display",
  hostId: "fixture-display-host",
  hostClass: "display-host",
  surfaceKind: "display-only",
  authority: "display-only",
  presenceCapability: "display-only",
  approvalCapability: "display-only",
  canDenyApprovals: false,
  canApproveLowRisk: false,
  canApproveMediumRisk: false,
  requiresPrimaryHostEscalation: true,
  userPresenceRequired: false,
});

export const LUCA_LINK_LOW_RISK_DISPLAY_APPROVAL_REQUEST = request({
  id: "fixture-low-risk-display-present",
  title: "Present project status preview",
  permission: "display.present",
  eventName: "display.preview.requested",
  requestedByDeviceId: "fixture-requesting-host",
  payloadPreview: {
    title: "Project status",
    contentKind: "dashboard_panel",
    apiToken: "fixture-value-that-must-be-redacted",
  },
});

export const LUCA_LINK_HIGH_RISK_APPROVAL_REQUEST = request({
  id: "fixture-high-risk-network-install",
  title: "Review network and install request",
  risk: "high",
  permission: "network.mutation install.request file.write",
  summary: "Request-like metadata that must escalate to the Primary Host.",
});

export const LUCA_LINK_EXPIRED_APPROVAL_REQUEST = request({
  id: "fixture-expired-request",
  title: "Expired approval request",
  status: "expired",
  expiresAt: FIXTURE_NOW - 1,
});

export const LUCA_LINK_MEDIUM_RISK_WEB_DISPLAY_INTENT =
  createLucaLinkWebDisplaySessionIntent({
    sessionId: "fixture-medium-web-display",
    requestedByHostId: "fixture-requesting-host",
    targetHostId: "fixture-companion-host",
    title: "Review project presentation preview",
    urlPreview: "https://example.com/project/overview",
    contentKind: "presentation",
    riskLevel: "medium",
    privacyLevel: "project",
    createdAt: new Date(FIXTURE_NOW).toISOString(),
    expiresAt: new Date(FIXTURE_EXPIRY).toISOString(),
  });

export const LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION =
  createApprovalNotificationFromRequest({
    request: LUCA_LINK_LOW_RISK_DISPLAY_APPROVAL_REQUEST,
    surface: LUCA_LINK_TRUSTED_COMPANION_APPROVAL_SURFACE,
    now: FIXTURE_NOW,
  });

export const LUCA_LINK_SAMPLE_WEB_DISPLAY_APPROVAL_NOTIFICATION =
  createApprovalNotificationFromWebDisplayIntent({
    intent: LUCA_LINK_MEDIUM_RISK_WEB_DISPLAY_INTENT,
    surface: LUCA_LINK_TRUSTED_COMPANION_APPROVAL_SURFACE,
    now: FIXTURE_NOW,
  });

export const LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION_INBOX =
  createApprovalNotificationInbox({
    notifications: [
      LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION,
      ...(LUCA_LINK_SAMPLE_WEB_DISPLAY_APPROVAL_NOTIFICATION
        ? [LUCA_LINK_SAMPLE_WEB_DISPLAY_APPROVAL_NOTIFICATION]
        : []),
    ],
    now: FIXTURE_NOW,
  });
