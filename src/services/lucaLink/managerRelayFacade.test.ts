import { describe, expect, it, vi } from "vitest";

// The legacy client pulls in socket.io + crypto on import; mock the module
// boundary so this stays a pure contract test.
vi.mock("socket.io-client", () => ({ io: vi.fn() }));

import { lucaLinkManager } from "./manager";
import { lucaLink } from "../lucaLinkService";

describe("lucaLinkManager.relay (consolidation facade)", () => {
  it("exposes the legacy relay client through the manager", () => {
    expect(lucaLinkManager.relay).toBe(lucaLink);
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
});
