import { describe, expect, it, vi } from "vitest";

// The legacy client pulls in socket.io + crypto on import; mock the module
// boundary so this stays a pure contract test.
vi.mock("socket.io-client", () => ({ io: vi.fn() }));

import { lucaLinkManager } from "./manager";
import { lucaLinkRelayBoundary as lucaLink } from "./lucaLinkRelayBoundary";

describe("lucaLinkManager relay API", () => {
  it("exposes the governance surface through the manager (same state)", () => {
    expect(lucaLinkManager.governance).not.toBe(lucaLink);
    const surface = [
      "getTrustedDevices",
      "renameTrustedDevice",
      "revokeTrustedDevice",
      "getPendingApprovalRequests",
      "approveApprovalRequest",
      "denyApprovalRequest",
      "getContinuationTokens",
      "prepareSafeContinuation",
      "consumePreparedContinuation",
      "enableSoftEnforcement",
      "getSoftEnforcementMode",
    ] as const;
    for (const method of surface) {
      expect(typeof (lucaLinkManager.governance as any)[method]).toBe(
        "function",
      );
    }
  });

  it("exposes the settings-console surface through the manager (same state)", () => {
    expect(lucaLinkManager.console).not.toBe(lucaLink);
    for (const method of ["getHandoffs", "getBridgeReviews", "getApprovalSurfaces", "getFreshHostConnections", "getRuntimeShadowSummary"]) {
      expect(typeof (lucaLinkManager.console as any)[method]).toBe("function");
    }
    expect("send" in (lucaLinkManager.console as object)).toBe(false);
    expect("sendToGuest" in (lucaLinkManager.console as object)).toBe(false);
  });

  it("exposes explicit relay operations without returning the implementation", () => {
    const surface = [
      "createRelayRoom",
      "joinRelayWithToken",
      "autoConnectRelay",
      "disconnectRelay",
      "generateRelayGuestSession",
      "initRelayGuestHandler",
      "onRelayGuestMessage",
      "sendRelayToGuest",
      "getRelayState",
      "onRelayStateChange",
      "onRelayMessage",
      "sendRelayMessage",
      "beamRelayPacket",
      "syncRelayMission",
      "getRelayPairingUrl",
    ] as const;
    for (const method of surface) {
      expect(typeof (lucaLinkManager as any)[method]).toBe("function");
    }
    expect("relay" in (lucaLinkManager as object)).toBe(false);
  });

  it("routes application relay sends through manager-owned methods", () => {
    const send = vi.spyOn(lucaLink, "send").mockReturnValue(true);
    const getState = vi.spyOn(lucaLink, "getState");

    expect(
      lucaLinkManager.sendRelayMessage("all", "theme_update", {
        theme: { hex: "#fff" },
      }),
    ).toBe(true);
    expect(send).toHaveBeenCalledWith("all", "theme_update", {
      theme: { hex: "#fff" },
    });
    expect(lucaLinkManager.getRelayState()).toBe(getState.mock.results[0]?.value);

    send.mockRestore();
    getState.mockRestore();
  });
});
