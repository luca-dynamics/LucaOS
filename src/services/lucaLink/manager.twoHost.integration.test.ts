import { beforeEach, describe, expect, it, vi } from "vitest";
import { CryptoService } from "./crypto";
import { LucaLinkManager } from "./manager";
import type { Device, KeyPair, LucaLinkMessage } from "./types";

const device = (id: string, identityPublicKey: string): Device => ({
  id,
  name: id,
  type: "desktop",
  platform: "windows",
  capabilities: ["read_status"],
  status: "online",
  lastSeen: new Date(),
  trustLevel: 80,
  metadata: {},
  identityPublicKey,
});

const errorHandler = () => ({
  createError: vi.fn(() => ({})),
  handleError: vi.fn(),
  on: vi.fn(),
});

const envelope = (message: LucaLinkMessage) => ({
  type: message.type,
  payload: message.payload,
  target: message.target,
  source: message.source,
  timestamp: message.timestamp,
  commandId: message.commandId,
});

describe("LucaLinkManager two-host security integration", () => {
  let hostA: LucaLinkManager;
  let hostB: LucaLinkManager;
  let keysA: KeyPair;
  let keysB: KeyPair;
  let recordA: Device;
  let recordB: Device;
  let sideEffect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    keysA = CryptoService.generateIdentityKeyPair();
    keysB = CryptoService.generateIdentityKeyPair();
    recordA = device("host-a", CryptoService.encodeKey(keysA.publicKey));
    recordB = device("host-b", CryptoService.encodeKey(keysB.publicKey));

    const registryA = {
      getDevice: vi.fn((id: string) => (id === "host-b" ? recordB : null)),
      selectBestDevice: vi.fn(() => recordB),
    };
    const registryB = {
      getDevice: vi.fn((id: string) => (id === "host-a" ? recordA : null)),
    };

    hostA = new LucaLinkManager(registryA as never, {} as never, errorHandler() as never);
    hostB = new LucaLinkManager(registryB as never, {} as never, errorHandler() as never);
    Object.assign(hostA as any, { myDeviceId: "host-a", identityKeyPair: keysA });
    Object.assign(hostB as any, { myDeviceId: "host-b", identityKeyPair: keysB });

    (hostA as any).socket = {
      isConnected: () => true,
      send: (message: LucaLinkMessage) =>
        (hostB as any).handleIncomingMessage(structuredClone(message)),
    };
    (hostB as any).socket = {
      isConnected: () => true,
      send: (message: LucaLinkMessage) =>
        (hostA as any).handleIncomingMessage(structuredClone(message)),
    };

    sideEffect = vi.fn();
    hostB.on("command:received", async (event) => {
      sideEffect(event.data.message.payload);
      await hostB.sendResponse("host-a", event.data.message.commandId, {
        ok: true,
        host: "host-b",
      });
    });
  });

  it("completes a signed pinned host-to-host command round trip", async () => {
    await expect(hostA.delegateTool("host-b", "read_status", {})).resolves.toEqual({
      ok: true,
      host: "host-b",
    });
    expect(sideEffect).toHaveBeenCalledOnce();
  });

  it("rejects hostile command variants before receiver side effects", async () => {
    let sequence = 0;
    const signed = (overrides: Partial<LucaLinkMessage> = {}) => {
      const message: LucaLinkMessage = {
        type: "command",
        payload: { command: "read_status", args: {} },
        source: "host-a",
        target: "host-b",
        timestamp: Date.now(),
        commandId: `attack-${++sequence}`,
        identityPublicKey: recordA.identityPublicKey,
        ...overrides,
      };
      message.identitySignature = CryptoService.signPayload(
        envelope(message),
        keysA.secretKey,
      );
      return message;
    };

    const unknown = signed({ source: "unknown" });
    await (hostB as any).handleIncomingMessage(unknown);

    recordA = { ...recordA, status: "offline" };
    await (hostB as any).handleIncomingMessage(signed());
    recordA = { ...recordA, status: "online" };

    await (hostB as any).handleIncomingMessage(
      signed({ timestamp: Date.now() - 60_001 }),
    );
    await (hostB as any).handleIncomingMessage(signed({ target: "host-c" }));

    const attackerKeys = CryptoService.generateIdentityKeyPair();
    await (hostB as any).handleIncomingMessage(
      signed({
        identityPublicKey: CryptoService.encodeKey(attackerKeys.publicKey),
      }),
    );

    const tampered = signed();
    tampered.payload = { command: "write_file", args: {} };
    await (hostB as any).handleIncomingMessage(tampered);

    const replayed = signed();
    await (hostB as any).handleIncomingMessage(replayed);
    sideEffect.mockClear();
    await (hostB as any).handleIncomingMessage(replayed);

    expect(sideEffect).not.toHaveBeenCalled();
  });
});
