import { describe, expect, it } from "vitest";
import type { SandboxFleetSession } from "../../types/sandboxFleet";
import { SandboxHostCapabilityBridge } from "./SandboxHostCapabilityBridge";

const session = (overrides: Partial<SandboxFleetSession> = {}): SandboxFleetSession => ({
  sessionId: "session-1",
  missionId: "mission-1",
  status: "running",
  backendId: "local-wsl2",
  backendKind: "wsl2",
  hostId: "host-windows",
  hostPlatform: "windows",
  locality: "local",
  isolationTier: "vm",
  guestOs: "linux",
  imageId: "ubuntu",
  imageDigest: "sha256:ubuntu",
  capabilities: ["terminal"],
  persistence: "ephemeral",
  runtimeRef: {},
  createdAt: "2026-07-12T00:00:00.000Z",
  updatedAt: "2026-07-12T00:00:00.000Z",
  hostFallbackAllowed: false,
  ...overrides,
});

describe("SandboxHostCapabilityBridge", () => {
  it("creates pending host capability requests with mission-scoped provenance", () => {
    const bridge = new SandboxHostCapabilityBridge(
      { get: () => session() },
      { idFactory: () => "request-1", now: () => "2026-07-12T00:00:00.000Z", ttlMs: 60_000 },
    );

    expect(bridge.request({
      missionId: "mission-1",
      sessionId: "session-1",
      capability: "host_file_write",
      reason: "write approved build output",
      scope: { path: "dist/app.zip" },
    })).toMatchObject({
      requestId: "request-1",
      status: "pending",
      hostFallbackAllowed: false,
      scope: { path: "dist/app.zip" },
      expiresAt: "2026-07-12T00:01:00.000Z",
    });
  });

  it("enforces mission ownership and running session state", () => {
    const stopped = new SandboxHostCapabilityBridge({ get: () => session({ status: "suspended" }) });
    expect(() => stopped.request({
      missionId: "mission-1",
      sessionId: "session-1",
      capability: "ui_input",
      reason: "test",
    })).toThrow("not running");

    const wrongMission = new SandboxHostCapabilityBridge({ get: () => session() });
    expect(() => wrongMission.request({
      missionId: "mission-2",
      sessionId: "session-1",
      capability: "ui_input",
      reason: "test",
    })).toThrow("does not belong");
  });

  it("approves once and consumes approved capabilities once", () => {
    const bridge = new SandboxHostCapabilityBridge(
      { get: () => session() },
      { idFactory: () => "request-1", now: () => "2026-07-12T00:00:00.000Z" },
    );
    bridge.request({ missionId: "mission-1", sessionId: "session-1", capability: "signing_key", reason: "sign package" });

    expect(bridge.approve("request-1").status).toBe("approved");
    expect(bridge.consume("request-1").status).toBe("consumed");
    expect(() => bridge.consume("request-1")).toThrow("not approved");
  });

  it("expires pending and approved requests fail closed", () => {
    let now = "2026-07-12T00:00:00.000Z";
    const bridge = new SandboxHostCapabilityBridge(
      { get: () => session() },
      { idFactory: () => "request-1", now: () => now, ttlMs: 1_000 },
    );
    bridge.request({ missionId: "mission-1", sessionId: "session-1", capability: "credential_access", reason: "fetch token" });
    now = "2026-07-12T00:00:02.000Z";

    expect(bridge.get("request-1")?.status).toBe("expired");
    expect(() => bridge.approve("request-1")).toThrow("already decided");
  });
});

