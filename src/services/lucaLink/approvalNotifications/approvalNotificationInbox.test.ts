import { describe, expect, it } from "vitest";
import { LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION } from "./approvalNotificationFixtures";
import {
  createApprovalNotificationInbox,
  listPendingApprovalNotifications,
  markNotificationExpired,
  markNotificationViewed,
  summarizeApprovalNotificationInbox,
  upsertApprovalNotification,
} from "./approvalNotificationInbox";

describe("LucaLink approval notification inbox", () => {
  it("keeps notification-local updates pure and in memory", () => {
    const original = createApprovalNotificationInbox({
      notifications: [LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION],
      now: 1,
    });
    const viewed = markNotificationViewed(
      original,
      LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION.notificationId,
      2,
    );
    expect(original.notifications[0].status).toBe("action_required");
    expect(viewed.notifications[0].status).toBe("viewed");
    expect(viewed.sideEffectsPerformed).toBe(false);
    expect(listPendingApprovalNotifications(viewed)).toHaveLength(1);

    const expired = markNotificationExpired(
      viewed,
      LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION.notificationId,
      3,
    );
    expect(listPendingApprovalNotifications(expired)).toHaveLength(0);
    expect(summarizeApprovalNotificationInbox(expired).expired).toBe(1);
  });

  it("upserts without mutating the input inbox", () => {
    const original = createApprovalNotificationInbox({ now: 1 });
    const updated = upsertApprovalNotification(
      original,
      LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION,
      2,
    );
    expect(original.notifications).toHaveLength(0);
    expect(updated.notifications).toHaveLength(1);
    expect(updated.sideEffectsPerformed).toBe(false);
  });
});
