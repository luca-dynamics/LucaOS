import type {
  LucaLinkApprovalNotification,
  LucaLinkApprovalNotificationStatus,
} from "./approvalNotificationTypes";

export interface LucaLinkApprovalNotificationInbox {
  notifications: LucaLinkApprovalNotification[];
  createdAt: number;
  updatedAt: number;
  sideEffectsPerformed: false;
}

export interface LucaLinkApprovalNotificationInboxSummary {
  total: number;
  pending: number;
  expired: number;
  blocked: number;
  byStatus: Record<LucaLinkApprovalNotificationStatus, number>;
  byRisk: Record<"low" | "medium" | "high" | "critical", number>;
  sideEffectsPerformed: false;
}

function cloneNotification(
  notification: LucaLinkApprovalNotification,
): LucaLinkApprovalNotification {
  return {
    ...notification,
    allowedNotificationActions: [...notification.allowedNotificationActions],
    blockedActions: [...notification.blockedActions],
    warnings: [...notification.warnings],
    errors: [...notification.errors],
    sideEffectsPerformed: false,
  };
}

export function createApprovalNotificationInbox(
  input: {
    notifications?: LucaLinkApprovalNotification[];
    now?: number;
  } = {},
): LucaLinkApprovalNotificationInbox {
  const now = input.now ?? Date.now();
  return {
    notifications: (input.notifications ?? []).map(cloneNotification),
    createdAt: now,
    updatedAt: now,
    sideEffectsPerformed: false,
  };
}

export function upsertApprovalNotification(
  inbox: LucaLinkApprovalNotificationInbox,
  notification: LucaLinkApprovalNotification,
  now: number = Date.now(),
): LucaLinkApprovalNotificationInbox {
  const existingIndex = inbox.notifications.findIndex(
    (item) => item.notificationId === notification.notificationId,
  );
  const notifications = inbox.notifications.map(cloneNotification);
  if (existingIndex >= 0)
    notifications[existingIndex] = cloneNotification(notification);
  else notifications.push(cloneNotification(notification));
  return {
    ...inbox,
    notifications,
    updatedAt: now,
    sideEffectsPerformed: false,
  };
}

function updateNotificationStatus(
  inbox: LucaLinkApprovalNotificationInbox,
  notificationId: string,
  status: LucaLinkApprovalNotificationStatus,
  now: number,
): LucaLinkApprovalNotificationInbox {
  return {
    ...inbox,
    notifications: inbox.notifications.map((notification) =>
      notification.notificationId === notificationId
        ? { ...cloneNotification(notification), status, updatedAt: now }
        : cloneNotification(notification),
    ),
    updatedAt: now,
    sideEffectsPerformed: false,
  };
}

export function markNotificationViewed(
  inbox: LucaLinkApprovalNotificationInbox,
  notificationId: string,
  now: number = Date.now(),
): LucaLinkApprovalNotificationInbox {
  return updateNotificationStatus(inbox, notificationId, "viewed", now);
}

export function markNotificationExpired(
  inbox: LucaLinkApprovalNotificationInbox,
  notificationId: string,
  now: number = Date.now(),
): LucaLinkApprovalNotificationInbox {
  return updateNotificationStatus(inbox, notificationId, "expired", now);
}

export function listPendingApprovalNotifications(
  inbox: LucaLinkApprovalNotificationInbox,
): LucaLinkApprovalNotification[] {
  return inbox.notifications
    .filter((notification) =>
      ["unread", "viewed", "action_required"].includes(notification.status),
    )
    .map(cloneNotification);
}

export function summarizeApprovalNotificationInbox(
  inbox: LucaLinkApprovalNotificationInbox,
): LucaLinkApprovalNotificationInboxSummary {
  const byStatus: LucaLinkApprovalNotificationInboxSummary["byStatus"] = {
    unread: 0,
    viewed: 0,
    action_required: 0,
    approved_intent: 0,
    denied_intent: 0,
    escalated: 0,
    expired: 0,
    blocked: 0,
  };
  const byRisk = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const notification of inbox.notifications) {
    byStatus[notification.status] += 1;
    byRisk[notification.risk] += 1;
  }
  return {
    total: inbox.notifications.length,
    pending: listPendingApprovalNotifications(inbox).length,
    expired: byStatus.expired,
    blocked: byStatus.blocked,
    byStatus,
    byRisk,
    sideEffectsPerformed: false,
  };
}
