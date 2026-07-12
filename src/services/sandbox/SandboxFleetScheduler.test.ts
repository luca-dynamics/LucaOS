import { describe, expect, it } from "vitest";
import type { SandboxFleetBackend, SandboxPlacementRequest } from "../../types/sandboxFleet";
import { SandboxFleetRegistry } from "./SandboxFleetRegistry";
import { SandboxFleetScheduler } from "./SandboxFleetScheduler";

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
  missionId: "mission-fleet-1",
  guestOs: "linux",
  distribution: "ubuntu",
  architecture: "x64",
  isolationTiers: ["vm", "microvm", "remote_vm"],
  locality: "any",
  capabilities: ["terminal"],
  persistence: "ephemeral",
  ...overrides,
});

describe("SandboxFleetScheduler", () => {
  it("places an exact Ubuntu request without changing guest identity", () => {
    const registry = new SandboxFleetRegistry();
    registry.register(backend({}));
    expect(new SandboxFleetScheduler(registry).place(request())).toMatchObject({
      status: "placed", backendId: "local-wsl2", imageId: "ubuntu-24-x64", hostFallbackAllowed: false,
    });
  });

  it("never places macOS on non-Apple hardware", () => {
    const registry = new SandboxFleetRegistry();
    registry.register(backend({
      backendId: "dishonest-mac",
      guestOs: ["macos"],
      images: [{ id: "macos-15", guestOs: "macos", version: "15", architecture: "arm64", digest: "sha256:mac" }],
    }));
    expect(new SandboxFleetScheduler(registry).place(request({ guestOs: "macos", architecture: "arm64", distribution: undefined }))).toMatchObject({ status: "blocked", backendId: null });
  });

  it("selects an attested Apple remote worker for macOS", () => {
    const registry = new SandboxFleetRegistry();
    registry.register(backend({
      backendId: "remote-apple-1", kind: "remote", hostId: "apple-worker", hostPlatform: "macos",
      locality: "remote", isolationTier: "remote_vm", guestOs: ["macos"], appleHardware: true,
      trust: "remote_attested",
      images: [{ id: "macos-15-arm64", guestOs: "macos", version: "15", architecture: "arm64", digest: "sha256:mac15" }],
    }));
    expect(new SandboxFleetScheduler(registry).place(request({ guestOs: "macos", architecture: "arm64", distribution: undefined, version: "15", locality: "remote" }))).toMatchObject({
      status: "placed", backendId: "remote-apple-1", imageId: "macos-15-arm64",
    });
  });

  it("blocks full, unverified, or capability-incompatible backends", () => {
    const registry = new SandboxFleetRegistry();
    registry.register(backend({ backendId: "full", activeSessions: 4 }));
    registry.register(backend({ backendId: "unverified", trust: "unverified" }));
    registry.register(backend({ backendId: "no-terminal", capabilities: ["workspace_read"] }));
    expect(new SandboxFleetScheduler(registry).place(request())).toMatchObject({ status: "blocked", hostFallbackAllowed: false });
  });

  it("chooses deterministically by trust, load, then backend id", () => {
    const registry = new SandboxFleetRegistry();
    registry.register(backend({ backendId: "local-b", activeSessions: 1 }));
    registry.register(backend({ backendId: "local-a", activeSessions: 1 }));
    registry.register(backend({ backendId: "remote-empty", locality: "remote", isolationTier: "remote_vm", activeSessions: 0, trust: "remote_attested" }));
    expect(new SandboxFleetScheduler(registry).place(request()).backendId).toBe("local-a");
  });
});

