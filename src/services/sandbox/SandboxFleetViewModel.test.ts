import { describe, expect, it } from "vitest";
import type { SandboxArtifactRecord, SandboxFleetBackend, SandboxFleetSession } from "../../types/sandboxFleet";
import { SandboxFleetViewModel } from "./SandboxFleetViewModel";

const backend = (overrides: Partial<SandboxFleetBackend> = {}): SandboxFleetBackend => ({
  backendId: "local-wsl2",
  kind: "wsl2",
  hostId: "host-windows",
  hostPlatform: "windows",
  locality: "local",
  isolationTier: "vm",
  guestOs: ["linux"],
  images: [{ id: "ubuntu", guestOs: "linux", distribution: "ubuntu", architecture: "x64", digest: "sha256:ubuntu" }],
  capabilities: ["terminal", "workspace_read", "workspace_write"],
  available: true,
  capacity: 2,
  activeSessions: 1,
  appleHardware: false,
  trust: "local_trusted",
  ...overrides,
});

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

const artifact = (overrides: Partial<SandboxArtifactRecord> = {}): SandboxArtifactRecord => ({
  artifactId: "artifact-1",
  missionId: "mission-1",
  sourceSessionId: "session-1",
  sourceGuestOs: "linux",
  sourceImageId: "ubuntu",
  sourceImageDigest: "sha256:ubuntu",
  kind: "package",
  name: "app.zip",
  relativePath: "dist/app.zip",
  sizeBytes: 10,
  digest: "sha256:artifact",
  scanStatus: "passed",
  approvalStatus: "not_required",
  createdAt: "2026-07-12T00:00:00.000Z",
  importedBySessionIds: [],
  provenance: {
    sourceBackendId: "local-wsl2",
    sourceHostId: "host-windows",
    sourceHostPlatform: "windows",
    sourceIsolationTier: "vm",
  },
  immutable: true,
  hostFallbackAllowed: false,
  ...overrides,
});

describe("SandboxFleetViewModel", () => {
  it("summarizes backend capacity and blocked reasons", () => {
    const view = new SandboxFleetViewModel().build({
      backends: [
        backend({ backendId: "available" }),
        backend({ backendId: "full", capacity: 1, activeSessions: 1 }),
        backend({ backendId: "unverified", trust: "unverified" }),
      ],
      sessions: [],
    });

    expect(view.hostFallbackAllowed).toBe(false);
    expect(view.backends.map((item) => [item.backendId, item.remainingSlots, item.blockedReason])).toEqual([
      ["available", 1, undefined],
      ["full", 0, "Backend capacity is full."],
      ["unverified", 1, "Backend trust is unverified."],
    ]);
  });

  it("marks active, expired, cleanup-needed, and switchable session state", () => {
    const view = new SandboxFleetViewModel().build({
      missionId: "mission-1",
      backends: [backend()],
      sessions: [
        session({ sessionId: "active", expiresAt: "2026-07-12T00:10:00.000Z" }),
        session({ sessionId: "expired", expiresAt: "2026-07-12T00:00:01.000Z" }),
        session({ sessionId: "other-mission", missionId: "mission-2" }),
      ],
      activeSessionIdByMission: { "mission-1": "active" },
      now: "2026-07-12T00:05:00.000Z",
    });

    expect(view.sessions.map((item) => [item.sessionId, item.active, item.expired, item.needsCleanup, item.switchable])).toEqual([
      ["active", true, false, false, true],
      ["expired", false, true, true, false],
    ]);
    expect(view.cleanupCount).toBe(1);
  });

  it("surfaces artifact scan and approval blockers", () => {
    const view = new SandboxFleetViewModel().build({
      backends: [],
      sessions: [],
      artifacts: [
        artifact({ artifactId: "clean", importedBySessionIds: ["windows"] }),
        artifact({ artifactId: "scan", scanStatus: "pending" }),
        artifact({ artifactId: "approval", approvalStatus: "pending" }),
      ],
    });

    expect(view.artifacts.map((item) => [item.artifactId, item.importCount, item.blockedReason])).toEqual([
      ["clean", 1, undefined],
      ["scan", 0, "Artifact scan has not passed."],
      ["approval", 0, "Artifact transfer is pending approval."],
    ]);
  });
});

