import { describe, expect, it } from "vitest";
import type { SandboxFleetBackend, SandboxPlacementRequest } from "../../types/sandboxFleet";
import { SandboxFleetRegistry } from "./SandboxFleetRegistry";
import { SandboxFleetSessionBroker, type SandboxFleetRuntimeAdapter } from "./SandboxFleetSessionBroker";

const backend = (overrides: Partial<SandboxFleetBackend>): SandboxFleetBackend => ({
  backendId: "local-wsl2",
  kind: "wsl2",
  hostId: "host-windows",
  hostPlatform: "windows",
  locality: "local",
  isolationTier: "vm",
  guestOs: ["linux"],
  images: [{ id: "ubuntu-24-x64", guestOs: "linux", distribution: "ubuntu", version: "24.04", architecture: "x64", digest: "sha256:ubuntu" }],
  capabilities: ["terminal", "workspace_read", "workspace_write", "network"],
  available: true,
  capacity: 4,
  activeSessions: 0,
  appleHardware: false,
  trust: "local_trusted",
  ...overrides,
});

const request = (overrides: Partial<SandboxPlacementRequest> = {}): SandboxPlacementRequest => ({
  missionId: "mission-fleet",
  guestOs: "linux",
  distribution: "ubuntu",
  architecture: "x64",
  isolationTiers: ["vm", "microvm", "remote_vm"],
  locality: "any",
  capabilities: ["terminal"],
  persistence: "ephemeral",
  ...overrides,
});

const adapter = (events: string[] = []): SandboxFleetRuntimeAdapter => ({
  async create(input) {
    events.push(`create:${input.backend.backendId}:${input.sessionId}`);
    return { runtimeRef: { backendId: input.backend.backendId, sessionId: input.sessionId } };
  },
  async execute(runtimeRef, command) {
    events.push(`execute:${(runtimeRef as { sessionId: string }).sessionId}:${command.executable}`);
    return { stdout: "ok", stderr: "", exitCode: 0 };
  },
  async suspend(runtimeRef) {
    events.push(`suspend:${(runtimeRef as { sessionId: string }).sessionId}`);
  },
  async resume(runtimeRef) {
    events.push(`resume:${(runtimeRef as { sessionId: string }).sessionId}`);
  },
  async snapshot(runtimeRef) {
    events.push(`snapshot:${(runtimeRef as { sessionId: string }).sessionId}`);
    return { runtimeSnapshotRef: { snapshotFor: (runtimeRef as { sessionId: string }).sessionId } };
  },
  async destroy(runtimeRef) {
    events.push(`destroy:${(runtimeRef as { sessionId: string }).sessionId}`);
  },
});

describe("SandboxFleetSessionBroker", () => {
  it("creates multiple guest sessions and switches the active mission session explicitly", async () => {
    const registry = new SandboxFleetRegistry();
    registry.register(backend({}));
    registry.register(backend({
      backendId: "remote-apple",
      kind: "remote",
      hostId: "apple-worker",
      hostPlatform: "macos",
      locality: "remote",
      isolationTier: "remote_vm",
      guestOs: ["macos"],
      images: [{ id: "macos-15-arm64", guestOs: "macos", version: "15", architecture: "arm64", digest: "sha256:mac15" }],
      appleHardware: true,
      trust: "remote_attested",
    }));

    let nextId = 0;
    const broker = new SandboxFleetSessionBroker(registry, { wsl2: adapter(), remote: adapter() }, () => `session-${++nextId}`);

    const ubuntu = await broker.create(request());
    const macos = await broker.create(request({
      guestOs: "macos",
      distribution: undefined,
      version: "15",
      architecture: "arm64",
      locality: "remote",
    }));

    expect(ubuntu.status).toBe("created");
    expect(macos.status).toBe("created");
    expect(broker.list("mission-fleet").map((session) => session.guestOs)).toEqual(["linux", "macos"]);

    broker.activate("mission-fleet", ubuntu.session!.sessionId);
    expect(broker.getActiveSession("mission-fleet")?.guestOs).toBe("linux");

    broker.activate("mission-fleet", macos.session!.sessionId);
    expect(broker.getActiveSession("mission-fleet")?.guestOs).toBe("macos");
  });

  it("routes execution by session id, not the active session pointer", async () => {
    const registry = new SandboxFleetRegistry();
    registry.register(backend({ backendId: "local-a" }));
    registry.register(backend({ backendId: "local-b", activeSessions: 1 }));
    const events: string[] = [];
    let nextId = 0;
    const broker = new SandboxFleetSessionBroker(registry, { wsl2: adapter(events) }, () => `session-${++nextId}`);

    const first = await broker.create(request());
    const second = await broker.create(request());
    broker.activate("mission-fleet", second.session!.sessionId);

    const result = await broker.execute(first.session!.sessionId, { executable: "node", args: ["--version"] });

    expect(result).toMatchObject({ sessionId: first.session!.sessionId, stdout: "ok", exitCode: 0 });
    expect(events).toContain(`execute:${first.session!.sessionId}:node`);
  });

  it("blocks creation when placement succeeds but no runtime adapter exists", async () => {
    const registry = new SandboxFleetRegistry();
    registry.register(backend({}));
    const broker = new SandboxFleetSessionBroker(registry, {}, () => "session-1");

    const result = await broker.create(request());

    expect(result).toMatchObject({ status: "blocked", session: null });
    expect(result.decision.hostFallbackAllowed).toBe(false);
    expect(result.decision.reasons).toContain("No runtime adapter is registered for the placed sandbox backend.");
  });

  it("updates capacity on create and destroy without leaking the active session", async () => {
    const registry = new SandboxFleetRegistry();
    registry.register(backend({ capacity: 1 }));
    const events: string[] = [];
    const broker = new SandboxFleetSessionBroker(registry, { wsl2: adapter(events) }, () => "session-1");

    const created = await broker.create(request());
    expect(registry.get("local-wsl2")?.activeSessions).toBe(1);
    broker.activate("mission-fleet", created.session!.sessionId);

    await broker.destroy(created.session!.sessionId);

    expect(registry.get("local-wsl2")?.activeSessions).toBe(0);
    expect(broker.getActiveSession("mission-fleet")).toBeUndefined();
    expect(events).toContain("destroy:session-1");
  });

  it("requires terminal capability and running state before executing", async () => {
    const registry = new SandboxFleetRegistry();
    registry.register(backend({}));
    let nextId = 0;
    const broker = new SandboxFleetSessionBroker(registry, { wsl2: adapter() }, () => `session-${++nextId}`);

    const noTerminal = await broker.create(request({ capabilities: ["workspace_read"] }));
    await expect(broker.execute(noTerminal.session!.sessionId, { executable: "node", args: [] })).rejects.toThrow("no terminal");

    const terminal = await broker.create(request());
    await broker.suspend(terminal.session!.sessionId);
    await expect(broker.execute(terminal.session!.sessionId, { executable: "node", args: [] })).rejects.toThrow("not running");
  });

  it("assigns expiry to ephemeral sessions and leaves persistent sessions unexpired", async () => {
    const registry = new SandboxFleetRegistry();
    registry.register(backend({ capacity: 2 }));
    let now = "2026-07-12T00:00:00.000Z";
    let nextId = 0;
    const broker = new SandboxFleetSessionBroker(registry, { wsl2: adapter() }, () => `session-${++nextId}`, () => now, 60_000);

    const ephemeral = await broker.create(request());
    const persistent = await broker.create(request({ persistence: "persistent" }));

    expect(ephemeral.session?.expiresAt).toBe("2026-07-12T00:01:00.000Z");
    expect(persistent.session?.expiresAt).toBeUndefined();
  });

  it("captures audit-safe session snapshots through the owning adapter", async () => {
    const registry = new SandboxFleetRegistry();
    registry.register(backend({}));
    const events: string[] = [];
    const broker = new SandboxFleetSessionBroker(registry, { wsl2: adapter(events) }, () => "snapshot-1");
    const created = await broker.create(request());

    const snapshot = await broker.snapshot(created.session!.sessionId);

    expect(snapshot).toMatchObject({
      snapshotId: "snapshot-1",
      sessionId: created.session!.sessionId,
      missionId: "mission-fleet",
      guestOs: "linux",
      hostFallbackAllowed: false,
      runtimeSnapshotRef: { snapshotFor: created.session!.sessionId },
    });
    expect(broker.get(created.session!.sessionId)?.lastSnapshotId).toBe("snapshot-1");
    expect(events).toContain(`snapshot:${created.session!.sessionId}`);
  });

  it("expires due sessions with a final snapshot and clears active mission selection", async () => {
    const registry = new SandboxFleetRegistry();
    registry.register(backend({}));
    let now = "2026-07-12T00:00:00.000Z";
    let nextId = 0;
    const broker = new SandboxFleetSessionBroker(registry, { wsl2: adapter() }, () => `id-${++nextId}`, () => now, 1_000);
    const created = await broker.create(request());
    broker.activate("mission-fleet", created.session!.sessionId);

    now = "2026-07-12T00:00:02.000Z";
    const snapshots = await broker.expireDueSessions();

    expect(snapshots).toHaveLength(1);
    expect(broker.get(created.session!.sessionId)?.status).toBe("expired");
    expect(broker.getActiveSession("mission-fleet")).toBeUndefined();
    expect(() => broker.activate("mission-fleet", created.session!.sessionId)).toThrow("Expired");
  });
});
