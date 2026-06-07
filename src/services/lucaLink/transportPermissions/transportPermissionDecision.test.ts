import { describe, expect, it } from "vitest";
import {
  LUCA_LINK_BLOCKED_MISSION_SYNC_TRANSPORT_FIXTURE,
  LUCA_LINK_BLOCKED_SENSITIVE_PAYLOAD_TRANSPORT_FIXTURE,
  LUCA_LINK_BOUNDED_HANDOFF_TRANSPORT_FIXTURE,
  LUCA_LINK_DISPLAY_INTENT_TRANSPORT_FIXTURE,
  LUCA_LINK_HIGH_RISK_GUEST_MESSAGE_TRANSPORT_FIXTURE,
  LUCA_LINK_LOCAL_HOST_STATUS_TRANSPORT_FIXTURE,
  LUCA_LINK_SENSOR_SNAPSHOT_TRANSPORT_FIXTURE,
  LUCA_LINK_TRANSPORT_FIXTURE_NOW,
  LUCA_LINK_VPN_FUTURE_TRANSPORT_FIXTURE,
  LUCA_LINK_WEBRTC_FUTURE_TRANSPORT_FIXTURE,
} from "./transportPermissionFixtures";
import {
  createTransportPermissionDecision,
  createTransportPermissionRequest,
  isTransportDecisionSendable,
} from "./transportPermissionDecision";

const decide = (
  request: Parameters<typeof createTransportPermissionDecision>[0],
  extra = {},
) =>
  createTransportPermissionDecision(request, {
    now: LUCA_LINK_TRANSPORT_FIXTURE_NOW,
    ...extra,
  });

describe("LucaLink transport permission decisions", () => {
  it("allows a local host status preview but never makes it sendable", () => {
    const value = decide(LUCA_LINK_LOCAL_HOST_STATUS_TRANSPORT_FIXTURE);
    expect(value.status).toBe("allowed_preview");
    expect(isTransportDecisionSendable(value)).toBe(false);
    expect(value.sideEffectsPerformed).toBe(false);
  });
  it("requires trusted context for relay approval notifications", () => {
    const request = createTransportPermissionRequest({
      ...LUCA_LINK_LOCAL_HOST_STATUS_TRANSPORT_FIXTURE,
      requestId: "untrusted-relay-notification",
      channel: "relay",
      messageClass: "approval_notification",
      trustLevel: "untrusted",
      sessionKind: "companion",
    });
    expect(decide(request).status).toBe("blocked");
  });

  it("requires approval for display and bounded handoff previews", () => {
    expect(decide(LUCA_LINK_DISPLAY_INTENT_TRANSPORT_FIXTURE).status).toBe(
      "approval_required",
    );
    expect(decide(LUCA_LINK_BOUNDED_HANDOFF_TRANSPORT_FIXTURE).status).toBe(
      "approval_required",
    );
  });
  it("keeps sensor snapshots read-only preview decisions", () => {
    expect(decide(LUCA_LINK_SENSOR_SNAPSHOT_TRANSPORT_FIXTURE)).toMatchObject({
      status: "allowed_preview",
      sideEffectsPerformed: false,
    });
  });
  it("blocks high-risk guest, raw/private mission, and sensitive payload fixtures", () => {
    expect(
      decide(LUCA_LINK_HIGH_RISK_GUEST_MESSAGE_TRANSPORT_FIXTURE).status,
    ).toBe("blocked");
    expect(
      decide(LUCA_LINK_BLOCKED_MISSION_SYNC_TRANSPORT_FIXTURE).status,
    ).toBe("blocked");
    expect(
      decide(LUCA_LINK_BLOCKED_SENSITIVE_PAYLOAD_TRANSPORT_FIXTURE).status,
    ).toBe("blocked");
  });
  it("keeps WebRTC and VPN unsupported and unsendable", () => {
    for (const request of [
      LUCA_LINK_WEBRTC_FUTURE_TRANSPORT_FIXTURE,
      LUCA_LINK_VPN_FUTURE_TRANSPORT_FIXTURE,
    ]) {
      const value = decide(request);
      expect(value.status).toBe("unsupported");
      expect(isTransportDecisionSendable(value)).toBe(false);
    }
  });
  it("marks expired requests expired", () => {
    expect(
      createTransportPermissionDecision(
        {
          ...LUCA_LINK_LOCAL_HOST_STATUS_TRANSPORT_FIXTURE,
          expiresAt: "2026-06-07T11:00:00.000Z",
        },
        { now: LUCA_LINK_TRANSPORT_FIXTURE_NOW },
      ).status,
    ).toBe("expired");
  });
  it("requires explicit metadata for private previews", () => {
    const request = createTransportPermissionRequest({
      ...LUCA_LINK_DISPLAY_INTENT_TRANSPORT_FIXTURE,
      requestId: "private-display",
      privacyLevel: "private",
      approvalSatisfied: true,
    });
    expect(decide(request).status).toBe("approval_required");
    expect(decide(request, { explicitApprovalMetadata: true }).status).toBe(
      "allowed_preview",
    );
  });
  it("blocks input that claims side effects were performed", () => {
    const unsafe = {
      ...LUCA_LINK_LOCAL_HOST_STATUS_TRANSPORT_FIXTURE,
      sideEffectsPerformed: true,
    } as unknown as typeof LUCA_LINK_LOCAL_HOST_STATUS_TRANSPORT_FIXTURE;
    expect(decide(unsafe).status).toBe("blocked");
  });
});
