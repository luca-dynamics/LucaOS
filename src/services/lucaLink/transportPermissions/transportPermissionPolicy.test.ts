import { describe, expect, it } from "vitest";
import { getLucaLinkTransportChannelPolicy } from "./transportPermissionPolicy";

describe("LucaLink transport channel policy", () => {
  it("keeps local-only preview inert and paired channels trust-gated", () => {
    expect(getLucaLinkTransportChannelPolicy("local_only")).toMatchObject({
      supportedForPolicyPreview: true,
      liveTransportEnabled: false,
    });
    expect(getLucaLinkTransportChannelPolicy("lan").minimumTrustLevel).toBe(
      "paired",
    );
    expect(
      getLucaLinkTransportChannelPolicy("relay").approvalRequiredAtOrAbove,
    ).toBe("medium");
  });
  it("keeps future transports unavailable", () => {
    for (const channel of ["webrtc", "vpn", "future_transport"] as const) {
      expect(getLucaLinkTransportChannelPolicy(channel)).toMatchObject({
        supportedForPolicyPreview: false,
        liveTransportEnabled: false,
      });
    }
  });
  it("limits guest relay to guest messages", () => {
    expect(getLucaLinkTransportChannelPolicy("guest_relay")).toMatchObject({
      allowedMessageClasses: ["guest_message"],
      requiredSessionKind: "guest",
    });
  });
});
