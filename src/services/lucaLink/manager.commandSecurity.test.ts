import { beforeEach, describe, expect, it, vi } from "vitest";

import { CryptoService } from "./crypto";
import { LucaLinkManager } from "./manager";
import type { Device, LucaLinkMessage } from "./types";

const keys = CryptoService.generateIdentityKeyPair();
const pinnedKey = CryptoService.encodeKey(keys.publicKey);

const peer: Device = {
  id: "peer-1",
  name: "Trusted peer",
  type: "desktop",
  platform: "windows",
  capabilities: ["messaging"],
  status: "online",
  lastSeen: new Date(),
  trustLevel: 80,
  metadata: {},
  identityPublicKey: pinnedKey,
};

const signatureEnvelope = (message: LucaLinkMessage) => ({
  type: message.type,
  payload: message.payload,
  target: message.target,
  source: message.source,
  timestamp: message.timestamp,
  commandId: message.commandId,
});

const signedCommand = (
  overrides: Partial<LucaLinkMessage> = {},
): LucaLinkMessage => {
  const message: LucaLinkMessage = {
    type: "command",
    payload: { command: "read_status", args: {} },
    target: "primary-1",
    source: "peer-1",
    timestamp: Date.now(),
    commandId: "cmd-1",
    identityPublicKey: pinnedKey,
    ...overrides,
  };
  message.identitySignature = CryptoService.signPayload(
    signatureEnvelope(message),
    keys.secretKey,
  );
  return message;
};

describe("LucaLinkManager command authorization", () => {
  let manager: LucaLinkManager;
  let getDevice: ReturnType<typeof vi.fn>;
  let received: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getDevice = vi.fn(() => peer);
    manager = new LucaLinkManager(
      { getDevice } as never,
      {} as never,
      {
        createError: vi.fn(() => ({})),
        handleError: vi.fn(),
        on: vi.fn(),
      } as never,
    );
    (manager as any).myDeviceId = "primary-1";
    received = vi.fn();
    manager.on("command:received", received);
  });

  it("accepts a fresh command signed by an online pinned peer", async () => {
    await (manager as any).handleIncomingMessage(signedCommand());
    expect(received).toHaveBeenCalledOnce();
  });

  it("rejects unknown and unpinned peers", async () => {
    getDevice.mockReturnValueOnce(null);
    await (manager as any).handleIncomingMessage(signedCommand());

    getDevice.mockReturnValueOnce({ ...peer, identityPublicKey: undefined });
    await (manager as any).handleIncomingMessage(
      signedCommand({ commandId: "cmd-2" }),
    );

    expect(received).not.toHaveBeenCalled();
  });

  it("rejects key substitution and signatures that do not bind routing", async () => {
    const attackerKeys = CryptoService.generateIdentityKeyPair();
    await (manager as any).handleIncomingMessage(
      signedCommand({
        identityPublicKey: CryptoService.encodeKey(attackerKeys.publicKey),
      }),
    );

    const tampered = signedCommand({ commandId: "cmd-2" });
    tampered.target = "different-host";
    await (manager as any).handleIncomingMessage(tampered);

    expect(received).not.toHaveBeenCalled();
  });

  it("rejects stale, future, and replayed commands", async () => {
    await (manager as any).handleIncomingMessage(
      signedCommand({ timestamp: Date.now() - 60_001 }),
    );
    await (manager as any).handleIncomingMessage(
      signedCommand({ commandId: "cmd-2", timestamp: Date.now() + 60_000 }),
    );

    const valid = signedCommand({ commandId: "cmd-3" });
    await (manager as any).handleIncomingMessage(valid);
    await (manager as any).handleIncomingMessage(valid);

    expect(received).toHaveBeenCalledOnce();
  });
});
