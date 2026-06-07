import {
  createLucaLinkApprovalPayloadPreview,
  type LucaLinkApprovalRequest,
} from "../lucaLinkApprovalQueue";
import type { LucaLinkApprovalSurfaceRecord } from "../lucaLinkMultiHostApproval";
import { evaluateLucaLinkWebDisplayBridgePolicy } from "../display/webDisplayBridgePolicy";
import {
  LUCA_LINK_WEB_DISPLAY_BLOCKED_ACTIONS,
  type LucaLinkWebDisplaySessionIntent,
} from "../display/webDisplayBridgeTypes";
import { evaluateLucaLinkApprovalNotificationPolicy } from "./approvalNotificationPolicy";
import type {
  LucaLinkApprovalNotification,
  LucaLinkApprovalNotificationDecision,
  LucaLinkApprovalNotificationDecisionIntent,
} from "./approvalNotificationTypes";

function safeId(value: string): string {
  return value.replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
}

export function createApprovalNotificationFromRequest(input: {
  request: LucaLinkApprovalRequest;
  surface: LucaLinkApprovalSurfaceRecord;
  now?: number;
}): LucaLinkApprovalNotification {
  const now = input.now ?? Date.now();
  const policy = evaluateLucaLinkApprovalNotificationPolicy(input);
  return {
    notificationId: `approval-notification-${safeId(input.request.id)}-${safeId(input.surface.id)}`,
    requestId: input.request.id,
    source: input.request.source,
    createdAt: now,
    updatedAt: now,
    expiresAt: input.request.expiresAt,
    status: policy.status,
    requestedByDeviceId: input.request.requestedByDeviceId,
    targetHostId: input.surface.hostId,
    targetSurfaceId: input.surface.id,
    title: input.request.title,
    summary: input.request.summary,
    reason: input.request.reason,
    risk: input.request.risk ?? "medium",
    permission: input.request.permission,
    eventName: input.request.eventName,
    payloadPreview: createLucaLinkApprovalPayloadPreview(
      input.request.payloadPreview,
    ),
    surfaceDecision: policy.surfaceEvaluation.decision,
    surfaceEligible: policy.surfaceEvaluation.eligible,
    requiresFreshPrimaryHostConfirmation:
      policy.surfaceEvaluation.requiresFreshPrimaryHostConfirmation,
    allowedNotificationActions: policy.allowedNotificationActions,
    blockedActions: policy.blockedActions,
    warnings: policy.warnings,
    errors: policy.errors,
    sideEffectsPerformed: false,
  };
}

export function createApprovalNotificationFromWebDisplayIntent(input: {
  intent: LucaLinkWebDisplaySessionIntent;
  surface: LucaLinkApprovalSurfaceRecord;
  now?: number;
}): LucaLinkApprovalNotification | undefined {
  if (input.intent.status !== "approval_required") return undefined;
  const now = input.now ?? Date.now();
  const displayPolicy = evaluateLucaLinkWebDisplayBridgePolicy(input.intent, {
    now: new Date(now),
  });
  const request: LucaLinkApprovalRequest = {
    id: `web-display-${input.intent.sessionId}`,
    status: "pending",
    source: "manual",
    createdAt: new Date(input.intent.createdAt).getTime(),
    updatedAt: now,
    expiresAt: new Date(input.intent.expiresAt).getTime(),
    requestedByDeviceId: input.intent.requestedByHostId,
    requestedTargetDeviceId: input.intent.targetHostId,
    eventName: "web_display.approval_required",
    lane: "display",
    permission: "display.present",
    risk: input.intent.riskLevel,
    title: input.intent.title,
    summary: "Web Display Bridge preview approval is required.",
    reason:
      "The target host must approve an inert preview before any future presentation flow.",
    explain:
      "Approval creates preview intent only; it does not open, cast, automate, or control a display.",
    payloadPreview: {
      title: input.intent.title,
      contentKind: input.intent.contentKind,
      sanitizedUrlPreview: displayPolicy.sanitizedUrlPreview,
      privacyLevel: input.intent.privacyLevel,
      displayMode:
        input.intent.contentKind === "presentation"
          ? "presentation_only"
          : "read_only",
      blockedActionsSummary: [...LUCA_LINK_WEB_DISPLAY_BLOCKED_ACTIONS],
    },
    warnings: [...input.intent.warnings, ...displayPolicy.warnings],
    errors: [...input.intent.blockers, ...displayPolicy.blockers],
  };
  const notification = createApprovalNotificationFromRequest({
    request,
    surface: input.surface,
    now,
  });
  return {
    ...notification,
    source: "web-display-bridge",
    warnings: [
      ...notification.warnings,
      "approve_preview_intent approves preview intent only, not display execution.",
    ],
  };
}

interface CreateDecisionIntentInput {
  decidedBySurfaceId: string;
  decidedByHostId: string;
  createdAt?: number;
  reason?: string;
}

function createDecisionIntent(
  notification: LucaLinkApprovalNotification,
  input: CreateDecisionIntentInput,
  requestedDecision: LucaLinkApprovalNotificationDecision,
): LucaLinkApprovalNotificationDecisionIntent {
  const allowed = notification.allowedNotificationActions.includes(
    requestedDecision === "dismiss" ? "dismiss" : requestedDecision,
  );
  const mustEscalate =
    requestedDecision === "approve_preview_intent" &&
    (!allowed ||
      notification.risk === "high" ||
      notification.risk === "critical" ||
      notification.requiresFreshPrimaryHostConfirmation);
  const decision = mustEscalate ? "escalate_primary_host" : requestedDecision;
  const createdAt = input.createdAt ?? Date.now();
  const errors =
    !allowed && !mustEscalate
      ? [`${requestedDecision} is not allowed for this notification surface.`]
      : [];
  return {
    intentId: `approval-notification-intent-${safeId(notification.notificationId)}-${decision}-${createdAt}`,
    notificationId: notification.notificationId,
    requestId: notification.requestId,
    decision,
    decidedBySurfaceId: input.decidedBySurfaceId,
    decidedByHostId: input.decidedByHostId,
    createdAt,
    reason: input.reason,
    requiresPrimaryHostFinalization:
      decision === "escalate_primary_host" ||
      notification.requiresFreshPrimaryHostConfirmation,
    sideEffectsPerformed: false,
    warnings: [
      "Decision intent is local model data only and was not sent or executed.",
      ...(mustEscalate
        ? ["Approval attempt was converted to Primary Host escalation."]
        : []),
    ],
    errors,
  };
}

export function createApprovePreviewIntent(
  notification: LucaLinkApprovalNotification,
  input: CreateDecisionIntentInput,
): LucaLinkApprovalNotificationDecisionIntent {
  return createDecisionIntent(notification, input, "approve_preview_intent");
}

export function createDenyIntent(
  notification: LucaLinkApprovalNotification,
  input: CreateDecisionIntentInput,
): LucaLinkApprovalNotificationDecisionIntent {
  return createDecisionIntent(notification, input, "deny_intent");
}

export function createEscalatePrimaryHostIntent(
  notification: LucaLinkApprovalNotification,
  input: CreateDecisionIntentInput,
): LucaLinkApprovalNotificationDecisionIntent {
  return createDecisionIntent(notification, input, "escalate_primary_host");
}

export function createDismissNotificationIntent(
  notification: LucaLinkApprovalNotification,
  input: CreateDecisionIntentInput,
): LucaLinkApprovalNotificationDecisionIntent {
  return createDecisionIntent(notification, input, "dismiss");
}
