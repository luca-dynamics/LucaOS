import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("socket.io-client", () => ({
  io: vi.fn(),
}));

import {
  LUCA_LINK_HANDOFF_MESSAGE_TYPE,
  lucaLink,
} from "./relayClientAdapter";
import { createLucaLinkHandoffRequest } from "./lucaLinkHandoff";
import { settingsService } from "../settingsService";
import { sessionManager } from "./sessionManager";

const originalGet = settingsService.get.bind(settingsService);

const enableLiveHandoff = () =>
  vi.spyOn(settingsService, "get").mockImplementation(((section: string) =>
    section === "lucaLink"
      ? { ...originalGet("lucaLink" as never), liveHandoffEnabled: true }
      : originalGet(section as never)) as typeof settingsService.get);

const registerApprovedHandoff = (
  overrides: Partial<Parameters<typeof createLucaLinkHandoffRequest>[0]> = {},
) => {
  const request = createLucaLinkHandoffRequest({
    kind: "conversation",
    title: "Continue current conversation",
    summary: "A protected continuation preview.",
    reason: "Live handoff test fixture.",
    sourceDeviceId: "device-a",
    targetDeviceId: "device-b",
    status: "approved",
    ...overrides,
  });
  const registered = (lucaLink as any).handoffStore.register(request);
  expect(registered.valid).toBe(true);
  return registered.request!;
};

describe("LucaLinkService live handoff transmission", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    (lucaLink as any).handoffStore.clear();
    lucaLink.clearApprovalQueue();
    (lucaLink as any).deviceTrustStore = {
      get: () => undefined,
    };
    (lucaLink as any).state = {
      connected: false,
      deviceId: null,
      pairingToken: null,
      connectedDevices: [],
      error: null,
    };
  });

  it("refuses to transmit while live handoff transport is disabled", async () => {
    const handoff = registerApprovedHandoff();
    const beamSpy = vi
      .spyOn(lucaLink, "beamPacket")
      .mockResolvedValue({ success: true });

    const result = await lucaLink.transmitHandoff(handoff.id);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Live handoff transport is disabled");
    expect(beamSpy).not.toHaveBeenCalled();
    expect(lucaLink.getHandoff(handoff.id)?.status).toBe("approved");
  });

  it("transmits an approved handoff encrypted and marks it sent", async () => {
    enableLiveHandoff();
    (lucaLink as any).deviceTrustStore = {
      get: (deviceId: string) => ({
        deviceId,
        displayName: deviceId,
        trustLevel: "trusted",
      }),
    };
    vi.spyOn(sessionManager, "recoverSessionByDevice").mockResolvedValue({
      sharedSecret: new Uint8Array(32),
    } as never);
    const beamSpy = vi
      .spyOn(lucaLink, "beamPacket")
      .mockResolvedValue({ success: true });
    const handoff = registerApprovedHandoff();

    const result = await lucaLink.transmitHandoff(handoff.id);

    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(beamSpy).toHaveBeenCalledWith(
      "device-b",
      expect.objectContaining({
        type: LUCA_LINK_HANDOFF_MESSAGE_TYPE,
        payload: expect.objectContaining({
          handoff: expect.objectContaining({ id: handoff.id, status: "sent" }),
        }),
      }),
    );
    expect(lucaLink.getHandoff(handoff.id)?.status).toBe("sent");
  });

  it("only transmits approved handoffs", async () => {
    enableLiveHandoff();
    const handoff = registerApprovedHandoff({ status: "draft" });
    const beamSpy = vi
      .spyOn(lucaLink, "beamPacket")
      .mockResolvedValue({ success: true });

    const result = await lucaLink.transmitHandoff(handoff.id);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Only approved handoffs");
    expect(beamSpy).not.toHaveBeenCalled();
  });

  it("never sends without a secure session with the target device", async () => {
    enableLiveHandoff();
    (lucaLink as any).deviceTrustStore = {
      get: (deviceId: string) => ({
        deviceId,
        displayName: deviceId,
        trustLevel: "trusted",
      }),
    };
    vi.spyOn(sessionManager, "recoverSessionByDevice").mockResolvedValue(
      null as never,
    );
    const beamSpy = vi
      .spyOn(lucaLink, "beamPacket")
      .mockResolvedValue({ success: true });
    const handoff = registerApprovedHandoff();

    const result = await lucaLink.transmitHandoff(handoff.id);

    expect(result.success).toBe(false);
    expect(result.error).toContain("never travel unencrypted");
    expect(beamSpy).not.toHaveBeenCalled();
    expect(lucaLink.getHandoff(handoff.id)?.status).toBe("approved");
  });

  it("refuses transmission to untrusted targets via the transport policy", async () => {
    enableLiveHandoff();
    // deviceTrustStore.get returns undefined → transport trust "untrusted",
    // which the bounded_handoff_preview class (minimum "trusted") rejects.
    (lucaLink as any).deviceTrustStore = { get: () => undefined };
    const beamSpy = vi
      .spyOn(lucaLink, "beamPacket")
      .mockResolvedValue({ success: true });
    const handoff = registerApprovedHandoff();

    const result = await lucaLink.transmitHandoff(handoff.id);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Transport policy refused the send");
    expect(beamSpy).not.toHaveBeenCalled();
  });

  it("registers inbound handoff packets as received", () => {
    const inbound = createLucaLinkHandoffRequest({
      kind: "conversation",
      title: "Continue current conversation",
      summary: "A protected continuation preview.",
      reason: "Live handoff test fixture.",
      sourceDeviceId: "device-a",
      targetDeviceId: "device-b",
      status: "sent",
    });

    (lucaLink as any).registerInboundHandoff({
      id: "msg-1",
      type: LUCA_LINK_HANDOFF_MESSAGE_TYPE,
      source: "device-a",
      target: "device-b",
      timestamp: Date.now(),
      payload: { handoff: inbound },
    });

    const registered = lucaLink.getHandoff(inbound.id);
    expect(registered?.status).toBe("received");
    expect(registered?.warnings.join(" ")).toContain(
      "Received over LucaLink from device-a",
    );
  });

  it("ignores replayed inbound handoff packets", () => {
    const handoff = registerApprovedHandoff();

    (lucaLink as any).registerInboundHandoff({
      id: "msg-2",
      type: LUCA_LINK_HANDOFF_MESSAGE_TYPE,
      source: "device-a",
      target: "device-b",
      timestamp: Date.now(),
      payload: { handoff },
    });

    // The registry entry keeps its original status — the replay is ignored.
    expect(lucaLink.getHandoff(handoff.id)?.status).toBe("approved");
  });
});
