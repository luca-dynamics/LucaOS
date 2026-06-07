import { describe, expect, it } from "vitest";
import {
  LUCA_LINK_DISPLAY_ONLY_APPROVAL_SURFACE,
  LUCA_LINK_EXPIRED_APPROVAL_REQUEST,
  LUCA_LINK_HIGH_RISK_APPROVAL_REQUEST,
  LUCA_LINK_LOW_RISK_DISPLAY_APPROVAL_REQUEST,
  LUCA_LINK_TRUSTED_COMPANION_APPROVAL_SURFACE,
} from "./approvalNotificationFixtures";
import { evaluateLucaLinkApprovalNotificationPolicy } from "./approvalNotificationPolicy";

const now = Date.UTC(2026, 5, 7, 12, 0, 0);

describe("LucaLink approval notification policy", () => {
  it("uses trusted companion low/medium authority for preview approval intents", () => {
    const result = evaluateLucaLinkApprovalNotificationPolicy({
      request: LUCA_LINK_LOW_RISK_DISPLAY_APPROVAL_REQUEST,
      surface: LUCA_LINK_TRUSTED_COMPANION_APPROVAL_SURFACE,
      now,
    });
    expect(result.surfaceEvaluation.decision).toBe("can-approve-low");
    expect(result.allowedNotificationActions).toContain(
      "approve_preview_intent",
    );
    expect(result.allowedNotificationActions).toContain("deny_intent");
    expect(result.sideEffectsPerformed).toBe(false);
  });

  it("lets display-only surfaces view but requires escalation", () => {
    const result = evaluateLucaLinkApprovalNotificationPolicy({
      request: LUCA_LINK_LOW_RISK_DISPLAY_APPROVAL_REQUEST,
      surface: LUCA_LINK_DISPLAY_ONLY_APPROVAL_SURFACE,
      now,
    });
    expect(result.allowedNotificationActions).toEqual([
      "view",
      "dismiss",
      "escalate_primary_host",
    ]);
    expect(result.allowedNotificationActions).not.toContain("deny_intent");
  });

  it("blocks public displays and surfaces with no authority", () => {
    const result = evaluateLucaLinkApprovalNotificationPolicy({
      request: LUCA_LINK_LOW_RISK_DISPLAY_APPROVAL_REQUEST,
      surface: {
        ...LUCA_LINK_DISPLAY_ONLY_APPROVAL_SURFACE,
        id: "public-surface",
        surfaceKind: "public-display",
        authority: "none",
        publicSurface: true,
        canDisplayApprovals: false,
      },
      now,
    });
    expect(result.status).toBe("blocked");
    expect(result.allowedNotificationActions).toEqual([]);
  });

  it("escalates high-risk and sensitive requests to the Primary Host", () => {
    const result = evaluateLucaLinkApprovalNotificationPolicy({
      request: LUCA_LINK_HIGH_RISK_APPROVAL_REQUEST,
      surface: LUCA_LINK_TRUSTED_COMPANION_APPROVAL_SURFACE,
      now,
    });
    expect(result.allowedNotificationActions).toContain(
      "escalate_primary_host",
    );
    expect(result.allowedNotificationActions).not.toContain(
      "approve_preview_intent",
    );
  });

  it.each([
    "physical_action",
    "payment",
    "robotics.motion",
    "smart-home.device-control",
    "install.request",
    "shell.execute",
    "file.write",
    "network.mutation",
  ])("escalates safety-sensitive permission %s", (permission) => {
    const result = evaluateLucaLinkApprovalNotificationPolicy({
      request: {
        ...LUCA_LINK_LOW_RISK_DISPLAY_APPROVAL_REQUEST,
        id: `sensitive-${permission}`,
        permission,
      },
      surface: LUCA_LINK_TRUSTED_COMPANION_APPROVAL_SURFACE,
      now,
    });
    expect(result.allowedNotificationActions).toContain(
      "escalate_primary_host",
    );
    expect(result.allowedNotificationActions).not.toContain(
      "approve_preview_intent",
    );
  });

  it("marks expired queue requests expired", () => {
    const result = evaluateLucaLinkApprovalNotificationPolicy({
      request: LUCA_LINK_EXPIRED_APPROVAL_REQUEST,
      surface: LUCA_LINK_TRUSTED_COMPANION_APPROVAL_SURFACE,
      now,
    });
    expect(result.status).toBe("expired");
    expect(result.allowedNotificationActions).toEqual([]);
  });
});
