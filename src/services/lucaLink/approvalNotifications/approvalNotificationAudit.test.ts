import { describe, expect, it } from "vitest";
import { LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION } from "./approvalNotificationFixtures";
import {
  createApprovalNotificationAuditRecord,
  summarizeApprovalNotificationAudit,
} from "./approvalNotificationAudit";

describe("LucaLink approval notification audit", () => {
  it("creates audit-only records with no side effects", () => {
    const record = createApprovalNotificationAuditRecord({
      notification: LUCA_LINK_SAMPLE_APPROVAL_NOTIFICATION,
      eventType: "created",
      timestamp: 1,
    });
    expect(record.sideEffectsPerformed).toBe(false);
    expect(record.surfaceDecision).toBe("can-approve-low");
    expect(summarizeApprovalNotificationAudit([record])).toEqual({
      total: 1,
      byEventType: {
        created: 1,
        viewed: 0,
        approve_intent_created: 0,
        deny_intent_created: 0,
        escalated: 0,
        expired: 0,
        blocked: 0,
      },
      sideEffectsPerformed: false,
    });
  });
});
