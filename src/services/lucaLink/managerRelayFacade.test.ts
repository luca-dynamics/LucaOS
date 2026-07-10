import { describe, expect, it, vi } from "vitest";

// The legacy client pulls in socket.io + crypto on import; mock the module
// boundary so this stays a pure contract test.
vi.mock("socket.io-client", () => ({ io: vi.fn() }));

import { lucaLinkManager } from "./manager";
import { lucaLink } from "./relayClientAdapter";

describe("lucaLinkManager.relay (consolidation facade)", () => {
  it("exposes the legacy relay client through the manager", () => {
    expect(lucaLinkManager.relay).toBe(lucaLink);
  });

  it("exposes the governance surface through the manager (same state)", () => {
    expect(lucaLinkManager.governance).toBe(lucaLink);
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
    expect(lucaLinkManager.console).toBe(lucaLink);
    for (const method of ["getHandoffs", "getBridgeReviews", "getApprovalSurfaces", "getFreshHostConnections", "getRuntimeShadowSummary"]) {
      expect(typeof (lucaLinkManager.console as any)[method]).toBe("function");
    }
  });

  it("carries the full allowed surface and nothing is undefined", () => {
    const surface = [
      "createRoom",
      "joinWithToken",
      "autoConnect",
      "disconnect",
      "generateGuestSession",
      "initGuestHandler",
      "onGuestMessage",
      "sendToGuest",
      "getState",
      "onStateChange",
      "onMessage",
      "send",
      "beamPacket",
      "syncMission",
      "getPairingUrl",
    ] as const;
    for (const method of surface) {
      expect(typeof (lucaLinkManager.relay as any)[method]).toBe("function");
    }
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
