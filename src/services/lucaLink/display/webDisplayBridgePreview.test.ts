import { describe, expect, it } from "vitest";
import { createLucaLinkWebDisplayPreviewPayload } from "./webDisplayBridgePreview";
import {
  createLucaLinkWebDisplaySessionIntent,
  markLucaLinkWebDisplaySessionApprovedForPreview,
} from "./webDisplaySession";
import { LUCA_LINK_WEB_DISPLAY_BLOCKED_ACTIONS } from "./webDisplayBridgeTypes";

const createdAt = "2026-06-07T10:00:00.000Z";
const approvedAt = "2026-06-07T10:01:00.000Z";

describe("LucaLink web display preview payload", () => {
  it("is non-interactive and blocks every remote-control action", () => {
    const intent = createLucaLinkWebDisplaySessionIntent({
      requestedByHostId: "primary-host",
      targetHostId: "display-host",
      title: "Safe dashboard",
      urlPreview: "https://example.com/dashboard?view=summary#section",
      contentKind: "dashboard_panel",
      createdAt,
      expiresAt: "2026-06-07T10:15:00.000Z",
    });
    const approved = markLucaLinkWebDisplaySessionApprovedForPreview(intent, {
      approvedByHostId: "display-host",
      approvedAt,
    });
    const preview = createLucaLinkWebDisplayPreviewPayload(approved, approvedAt);

    expect(preview.allowedActions).toEqual([]);
    expect(preview.blockedActions).toEqual(LUCA_LINK_WEB_DISPLAY_BLOCKED_ACTIONS);
    expect(preview.sanitizedUrlPreview).toBe(
      "https://example.com/dashboard?view=summary",
    );
    expect(preview.sideEffectsPerformed).toBe(false);
  });

  it("requires approval and does not create a preview from a pending intent", () => {
    const intent = createLucaLinkWebDisplaySessionIntent({
      requestedByHostId: "primary-host",
      targetHostId: "display-host",
      title: "Pending presentation",
      contentKind: "presentation",
      createdAt,
      expiresAt: "2026-06-07T10:15:00.000Z",
    });
    expect(() =>
      createLucaLinkWebDisplayPreviewPayload(intent, approvedAt),
    ).toThrow(/requires approval/i);
  });
});
