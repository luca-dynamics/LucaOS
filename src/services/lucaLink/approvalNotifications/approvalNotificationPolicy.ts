import type { LucaLinkApprovalRequest } from "../lucaLinkApprovalQueue";
import {
  evaluateLucaLinkApprovalSurfaceForRequest,
  type LucaLinkApprovalSurfaceRecord,
} from "../lucaLinkMultiHostApproval";
import {
  LUCA_LINK_APPROVAL_NOTIFICATION_BLOCKED_ACTIONS,
  type LucaLinkApprovalNotificationAction,
  type LucaLinkApprovalNotificationPolicyResult,
} from "./approvalNotificationTypes";

const SENSITIVE_REQUEST_PATTERN =
  /physical|payment|robot|smart.?home|device.?control|actuator|install|shell|file.?write|network.?(mutation|mutate|write|request)/i;

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function isExpired(request: LucaLinkApprovalRequest, now: number): boolean {
  return request.status === "expired" || request.expiresAt <= now;
}

function isSafetySensitive(request: LucaLinkApprovalRequest): boolean {
  return (
    request.risk === "high" ||
    request.risk === "critical" ||
    SENSITIVE_REQUEST_PATTERN.test(
      [
        request.permission,
        request.eventName,
        request.title,
        request.summary,
        request.reason,
        request.explain,
      ].join(" "),
    )
  );
}

export function evaluateLucaLinkApprovalNotificationPolicy(input: {
  request: LucaLinkApprovalRequest;
  surface: LucaLinkApprovalSurfaceRecord;
  now?: number;
}): LucaLinkApprovalNotificationPolicyResult {
  const now = input.now ?? Date.now();
  const surfaceEvaluation = evaluateLucaLinkApprovalSurfaceForRequest(
    input.surface,
    input.request,
  );
  const warnings = unique([
    ...input.request.warnings,
    ...surfaceEvaluation.warnings,
    "Notification decisions are intent-only and grant no execution authority.",
  ]);
  const errors = unique([...input.request.errors, ...surfaceEvaluation.errors]);
  const base = {
    surfaceEvaluation,
    blockedActions: [...LUCA_LINK_APPROVAL_NOTIFICATION_BLOCKED_ACTIONS],
    warnings,
    errors,
    sideEffectsPerformed: false as const,
  };

  if (isExpired(input.request, now)) {
    return { ...base, status: "expired", allowedNotificationActions: [] };
  }

  if (
    input.surface.authority === "none" ||
    surfaceEvaluation.decision === "blocked" ||
    surfaceEvaluation.decision === "invalid" ||
    errors.length > 0
  ) {
    return { ...base, status: "blocked", allowedNotificationActions: [] };
  }

  const actions: LucaLinkApprovalNotificationAction[] = ["view", "dismiss"];
  const displayOnly =
    input.surface.authority === "display-only" ||
    input.surface.surfaceKind === "display-only";
  const mustEscalate =
    displayOnly ||
    surfaceEvaluation.decision === "must-escalate-primary-host" ||
    (isSafetySensitive(input.request) &&
      input.surface.surfaceKind !== "primary-host-console");

  if (input.surface.canDenyApprovals && !displayOnly)
    actions.push("deny_intent");

  if (mustEscalate) {
    actions.push("escalate_primary_host");
  } else if (
    surfaceEvaluation.eligible &&
    (input.request.risk === "low" || input.request.risk === "medium")
  ) {
    actions.push("approve_preview_intent");
  } else if (!surfaceEvaluation.eligible) {
    actions.push("escalate_primary_host");
  }

  return {
    ...base,
    status: "action_required",
    allowedNotificationActions: unique(actions),
  };
}
