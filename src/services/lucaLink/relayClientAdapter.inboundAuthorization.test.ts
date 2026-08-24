import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("socket.io-client", () => ({ io: vi.fn() }));

import {
  getDefaultLucaLinkRuntimeEnforcementMode,
  LUCA_LINK_HANDOFF_MESSAGE_TYPE,
  lucaLink,
  type LucaLinkMessage,
} from "./relayClientAdapter";
import { sessionManager } from "./sessionManager";

const message = (
  type: string,
  overrides: Partial<LucaLinkMessage> = {},
): LucaLinkMessage => ({
  id: "message-1",
  type,
  source: "peer-1",
  target: "primary-1",
  timestamp: 1,
  payload: {},
  ...overrides,
});

describe("LucaLink inbound authorization boundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    (lucaLink as any).state = {
      connected: false,
      deviceId: null,
      pairingToken: null,
      connectedDevices: [],
      error: null,
    };
  });

  it("defaults production builds to full outbound enforcement", () => {
    expect(getDefaultLucaLinkRuntimeEnforcementMode(true)).toBe("full-outbound");
    expect(getDefaultLucaLinkRuntimeEnforcementMode(false)).toBe("disabled");
  });

  it("drops peer traffic from unknown devices", () => {
    (lucaLink as any).deviceTrustStore = { get: () => undefined };

    const result = (lucaLink as any).authorizeInboundMessage(
      message("message"),
      false,
    );

    expect(result).toMatchObject({
      allowed: false,
      messageClass: "peer-message",
    });
    expect(result.reason).toContain("unknown");
  });

  it("allows ordinary messages from active paired devices", () => {
    (lucaLink as any).deviceTrustStore = {
      get: () => ({ trustLevel: "paired", status: "connected" }),
    };

    expect(
      (lucaLink as any).authorizeInboundMessage(message("message"), false),
    ).toMatchObject({ allowed: true, messageClass: "peer-message" });
  });

  it.each([
    message("sync", { sync: { type: "mission", data: "mission" } }),
    message("SENSOR_PULSE"),
    message(LUCA_LINK_HANDOFF_MESSAGE_TYPE),
  ])("requires trusted secure sessions for sensitive inbound $type", (input) => {
    (lucaLink as any).deviceTrustStore = {
      get: () => ({ trustLevel: "trusted", status: "connected" }),
    };

    expect(
      (lucaLink as any).authorizeInboundMessage(input, false),
    ).toMatchObject({ allowed: false });
    expect(
      (lucaLink as any).authorizeInboundMessage(input, true),
    ).toMatchObject({ allowed: true });
  });

  it("rejects messages addressed to a different host", () => {
    (lucaLink as any).state.deviceId = "primary-1";
    (lucaLink as any).deviceTrustStore = {
      get: () => ({ trustLevel: "trusted", status: "connected" }),
    };

    const result = (lucaLink as any).authorizeInboundMessage(
      message("message", { target: "primary-2" }),
      false,
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("target");
  });

  it("never beams plaintext when the target has no secure session", async () => {
    (lucaLink as any).socket = { emit: vi.fn() };
    (lucaLink as any).state = {
      connected: true,
      deviceId: "primary-1",
      pairingToken: "token",
      connectedDevices: [],
      error: null,
    };
    vi.spyOn(sessionManager, "recoverSessionByDevice").mockResolvedValue(
      null as never,
    );

    const result = await lucaLink.beamPacket("peer-1", {
      type: "message",
      payload: { secret: true },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("never fall back to plaintext");
    expect((lucaLink as any).socket.emit).not.toHaveBeenCalled();
  });
});
