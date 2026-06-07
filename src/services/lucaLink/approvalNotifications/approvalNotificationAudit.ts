import type {
  LucaLinkApprovalNotification,
  LucaLinkApprovalNotificationDecisionIntent,
} from "./approvalNotificationTypes";

export type LucaLinkApprovalNotificationAuditEventType =
  | "created"
  | "viewed"
  | "approve_intent_created"
  | "deny_intent_created"
  | "escalated"
  | "expired"
  | "blocked";

export interface LucaLinkApprovalNotificationAuditRecord {
  auditId: string;
  notificationId: string;
  requestId: string;
  timestamp: number;
  eventType: LucaLinkApprovalNotificationAuditEventType;
  summary: string;
  risk: "low" | "medium" | "high" | "critical";
  surfaceDecision: LucaLinkApprovalNotification["surfaceDecision"];
  sideEffectsPerformed: false;
  warnings: string[];
  errors: string[];
}

export interface LucaLinkApprovalNotificationAuditSummary {
  total: number;
  byEventType: Record<LucaLinkApprovalNotificationAuditEventType, number>;
  sideEffectsPerformed: false;
}

export function createApprovalNotificationAuditRecord(input: {
  notification: LucaLinkApprovalNotification;
  eventType: LucaLinkApprovalNotificationAuditEventType;
  timestamp?: number;
  decisionIntent?: LucaLinkApprovalNotificationDecisionIntent;
  summary?: string;
}): LucaLinkApprovalNotificationAuditRecord {
  const timestamp = input.timestamp ?? Date.now();
  return {
    auditId: `approval-notification-audit-${input.notification.notificationId}-${input.eventType}-${timestamp}`,
    notificationId: input.notification.notificationId,
    requestId: input.notification.requestId,
    timestamp,
    eventType: input.eventType,
    summary:
      input.summary ??
      `${input.eventType.replace(/_/g, " ")}: ${input.notification.title}`,
    risk: input.notification.risk,
    surfaceDecision: input.notification.surfaceDecision,
    sideEffectsPerformed: false,
    warnings: [
      ...input.notification.warnings,
      ...(input.decisionIntent?.warnings ?? []),
    ],
    errors: [
      ...input.notification.errors,
      ...(input.decisionIntent?.errors ?? []),
    ],
  };
}

export function summarizeApprovalNotificationAudit(
  records: LucaLinkApprovalNotificationAuditRecord[],
): LucaLinkApprovalNotificationAuditSummary {
  const byEventType: LucaLinkApprovalNotificationAuditSummary["byEventType"] = {
    created: 0,
    viewed: 0,
    approve_intent_created: 0,
    deny_intent_created: 0,
    escalated: 0,
    expired: 0,
    blocked: 0,
  };
  for (const record of records) byEventType[record.eventType] += 1;
  return { total: records.length, byEventType, sideEffectsPerformed: false };
}
