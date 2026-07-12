import { describe, expect, it } from "vitest";
import type { SandboxRemoteWorkerDescriptor } from "../../types/sandboxFleet";
import { SandboxFleetRegistry } from "./SandboxFleetRegistry";
import { SandboxFleetScheduler } from "./SandboxFleetScheduler";
import { SandboxRemoteWorkerRegistrar } from "./SandboxRemoteWorkerRegistrar";

const descriptor = (overrides: Partial<SandboxRemoteWorkerDescriptor> = {}): SandboxRemoteWorkerDescriptor => ({
  workerId: "apple-worker-1",
  hostId: "mac-mini-1",
  hostPlatform: "macos",
  locality: "paired_host",
  isolationTier: "remote_vm",
  appleHardware: true,
  trust: "paired_trusted",
  capacity: 2,
  guestOs: ["macos"],
  capabilities: ["terminal", "workspace_read", "workspace_write"],
  images: [{ id: "macos-15-arm64", guestOs: "macos", version: "15", architecture: "arm64", digest: "sha256:macos15" }],
  attestationDigest: "sha256:attested",
  ...overrides,
});

describe("SandboxRemoteWorkerRegistrar", () => {
  it("registers attested Apple workers for macOS placement", () => {
    const registry = new SandboxFleetRegistry();
    const backend = new SandboxRemoteWorkerRegistrar(registry).register(descriptor());

    expect(backend).toMatchObject({
      backendId: "worker:apple-worker-1",
      hostPlatform: "macos",
      locality: "paired_host",
      appleHardware: true,
      trust: "paired_trusted",
    });

    expect(new SandboxFleetScheduler(registry).place({
      missionId: "mission-macos",
      guestOs: "macos",
      version: "15",
      architecture: "arm64",
      isolationTiers: ["remote_vm"],
      locality: "paired_host",
      capabilities: ["terminal"],
      persistence: "ephemeral",
    })).toMatchObject({ status: "placed", backendId: "worker:apple-worker-1", imageId: "macos-15-arm64" });
  });

  it("rejects macOS workers without Apple hardware attestation", () => {
    const registry = new SandboxFleetRegistry();
    expect(() => new SandboxRemoteWorkerRegistrar(registry).register(descriptor({ appleHardware: false }))).toThrow("Apple hardware");
  });

  it("rejects unverified workers", () => {
    const registry = new SandboxFleetRegistry();
    expect(() => new SandboxRemoteWorkerRegistrar(registry).register(descriptor({ trust: "unverified" }))).toThrow("Unverified");
  });
});

