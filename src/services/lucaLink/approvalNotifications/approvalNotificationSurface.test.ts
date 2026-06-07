import { describe, expect, it } from "vitest";
import typesSource from "./approvalNotificationTypes.ts?raw";
import policySource from "./approvalNotificationPolicy.ts?raw";
import surfaceSource from "./approvalNotificationSurface.ts?raw";
import inboxSource from "./approvalNotificationInbox.ts?raw";
import auditSource from "./approvalNotificationAudit.ts?raw";
import fixturesSource from "./approvalNotificationFixtures.ts?raw";
import indexSource from "./index.ts?raw";
import {
  LUCA_LINK_HIGH_RISK_APPROVAL_REQUEST,
  LUCA_LINK_LOW_RISK_DISPLAY_APPROVAL_REQUEST,
  LUCA_LINK_MEDIUM_RISK_WEB_DISPLAY_INTENT,
  LUCA_LINK_TRUSTED_COMPANION_APPROVAL_SURFACE,
} from "./approvalNotificationFixtures";
import {
  createApprovalNotificationFromRequest,
  createApprovalNotificationFromWebDisplayIntent,
  createApprovePreviewIntent,
  createDenyIntent,
  createEscalatePrimaryHostIntent,
} from "./approvalNotificationSurface";

const now = Date.UTC(2026, 5, 7, 12, 0, 0);

describe("LucaLink approval notification surface", () => {
  it("converts an approval queue request and redacts payload previews", () => {
    const notification = createApprovalNotificationFromRequest({
      request: LUCA_LINK_LOW_RISK_DISPLAY_APPROVAL_REQUEST,
      surface: LUCA_LINK_TRUSTED_COMPANION_APPROVAL_SURFACE,
      now,
    });
    expect(notification.requestId).toBe(
      LUCA_LINK_LOW_RISK_DISPLAY_APPROVAL_REQUEST.id,
    );
    expect(notification.surfaceDecision).toBe("can-approve-low");
    expect(notification.payloadPreview).toMatchObject({
      apiToken: "[redacted]",
    });
    expect(notification.sideEffectsPerformed).toBe(false);
  });

  it("converts approval-required Web Display Bridge intents only", () => {
    const notification = createApprovalNotificationFromWebDisplayIntent({
      intent: LUCA_LINK_MEDIUM_RISK_WEB_DISPLAY_INTENT,
      surface: LUCA_LINK_TRUSTED_COMPANION_APPROVAL_SURFACE,
      now,
    });
    expect(notification?.source).toBe("web-display-bridge");
    expect(notification?.permission).toBe("display.present");
    expect(notification?.payloadPreview).toMatchObject({
      title: LUCA_LINK_MEDIUM_RISK_WEB_DISPLAY_INTENT.title,
      displayMode: "presentation_only",
      sanitizedUrlPreview: "https://example.com/project/overview",
    });
    expect(
      createApprovalNotificationFromWebDisplayIntent({
        intent: {
          ...LUCA_LINK_MEDIUM_RISK_WEB_DISPLAY_INTENT,
          status: "approved_preview",
        },
        surface: LUCA_LINK_TRUSTED_COMPANION_APPROVAL_SURFACE,
        now,
      }),
    ).toBeUndefined();
  });

  it("creates approve and deny intents without changing the source request", () => {
    const original = structuredClone(
      LUCA_LINK_LOW_RISK_DISPLAY_APPROVAL_REQUEST,
    );
    const notification = createApprovalNotificationFromRequest({
      request: LUCA_LINK_LOW_RISK_DISPLAY_APPROVAL_REQUEST,
      surface: LUCA_LINK_TRUSTED_COMPANION_APPROVAL_SURFACE,
      now,
    });
    const input = {
      decidedBySurfaceId: notification.targetSurfaceId!,
      decidedByHostId: notification.targetHostId!,
      createdAt: now + 1,
    };
    expect(createApprovePreviewIntent(notification, input)).toMatchObject({
      decision: "approve_preview_intent",
      sideEffectsPerformed: false,
    });
    expect(createDenyIntent(notification, input)).toMatchObject({
      decision: "deny_intent",
      sideEffectsPerformed: false,
    });
    expect(LUCA_LINK_LOW_RISK_DISPLAY_APPROVAL_REQUEST).toEqual(original);
  });

  it("turns a high-risk approval attempt into Primary Host escalation", () => {
    const notification = createApprovalNotificationFromRequest({
      request: LUCA_LINK_HIGH_RISK_APPROVAL_REQUEST,
      surface: LUCA_LINK_TRUSTED_COMPANION_APPROVAL_SURFACE,
      now,
    });
    const intent = createApprovePreviewIntent(notification, {
      decidedBySurfaceId: notification.targetSurfaceId!,
      decidedByHostId: notification.targetHostId!,
      createdAt: now + 1,
    });
    expect(intent.decision).toBe("escalate_primary_host");
    expect(intent.requiresPrimaryHostFinalization).toBe(true);
    expect(
      createEscalatePrimaryHostIntent(notification, {
        decidedBySurfaceId: notification.targetSurfaceId!,
        decidedByHostId: notification.targetHostId!,
        createdAt: now + 2,
      }).requiresPrimaryHostFinalization,
    ).toBe(true);
  });

  it("contains no transport, persistence, execution, or Personal Intelligence imports", () => {
    const source = [
      typesSource,
      policySource,
      surfaceSource,
      inboxSource,
      auditSource,
      fixturesSource,
      indexSource,
    ].join("\n");
    for (const forbidden of [
      "lucaLinkService",
      "fetch(",
      "localStorage",
      "sessionStorage",
      "indexedDB",
      "child_process",
      "electron",
      "personal-intelligence",
      "LucaBrowser",
      "VisualCore",
      "document.",
      "window.",
    ])
      expect(source).not.toContain(forbidden);
  });
});
