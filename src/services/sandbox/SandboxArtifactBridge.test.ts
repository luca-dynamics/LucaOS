import { describe, expect, it } from "vitest";
import type { SandboxFleetSession } from "../../types/sandboxFleet";
import { SandboxArtifactBridge } from "./SandboxArtifactBridge";

const session = (overrides: Partial<SandboxFleetSession>): SandboxFleetSession => ({
  sessionId: "ubuntu-session",
  missionId: "mission-cross-platform",
  status: "running",
  backendId: "local-wsl2",
  backendKind: "wsl2",
  hostId: "windows-host",
  hostPlatform: "windows",
  locality: "local",
  isolationTier: "vm",
  guestOs: "linux",
  imageId: "ubuntu-24-x64",
  imageDigest: "sha256:ubuntu-image",
  capabilities: ["terminal", "workspace_read", "workspace_write"],
  persistence: "ephemeral",
  runtimeRef: { id: "ubuntu-session" },
  createdAt: "2026-07-12T10:00:00.000Z",
  updatedAt: "2026-07-12T10:00:00.000Z",
  hostFallbackAllowed: false,
  ...overrides,
});

const bridge = (
  sessions: SandboxFleetSession[],
  options: Partial<ConstructorParameters<typeof SandboxArtifactBridge>[1]> = {},
) => new SandboxArtifactBridge(
  { get: (sessionId) => sessions.find((candidate) => candidate.sessionId === sessionId) },
  {
    digest: async (bytes) => `sha256:test-${bytes.byteLength}`,
    scanner: { scan: async () => ({ status: "passed" }) },
    idFactory: () => "artifact-1",
    now: () => "2026-07-12T10:01:00.000Z",
    ...options,
  },
);

describe("SandboxArtifactBridge", () => {
  it("exports an immutable scanned artifact with source session provenance", async () => {
    const source = session({});
    const artifactBridge = bridge([source]);

    const artifact = await artifactBridge.export({
      missionId: source.missionId,
      sourceSessionId: source.sessionId,
      kind: "build_output",
      name: "dist.zip",
      relativePath: "dist/dist.zip",
      bytes: new Uint8Array([1, 2, 3]),
    });

    expect(artifact).toMatchObject({
      artifactId: "artifact-1",
      missionId: source.missionId,
      sourceSessionId: source.sessionId,
      sourceGuestOs: "linux",
      sourceImageDigest: "sha256:ubuntu-image",
      digest: "sha256:test-3",
      scanStatus: "passed",
      approvalStatus: "not_required",
      immutable: true,
      hostFallbackAllowed: false,
      provenance: {
        sourceBackendId: "local-wsl2",
        sourceHostPlatform: "windows",
      },
    });
  });

  it("imports the same Ubuntu artifact sequentially into Windows and macOS sessions", async () => {
    const source = session({});
    const windows = session({
      sessionId: "windows-session",
      backendId: "hyperv-win",
      backendKind: "hyperv",
      guestOs: "windows",
      imageId: "windows-11",
      imageDigest: "sha256:windows-image",
    });
    const macos = session({
      sessionId: "macos-session",
      backendId: "remote-apple",
      backendKind: "remote",
      hostId: "apple-worker",
      hostPlatform: "macos",
      locality: "remote",
      isolationTier: "remote_vm",
      guestOs: "macos",
      imageId: "macos-15-arm64",
      imageDigest: "sha256:macos-image",
    });
    const imported: string[] = [];
    const artifactBridge = bridge([source, windows, macos], {
      importer: { import: async ({ targetSession }) => { imported.push(targetSession.sessionId); } },
    });

    const artifact = await artifactBridge.export({
      missionId: source.missionId,
      sourceSessionId: source.sessionId,
      kind: "package",
      name: "app.tar.gz",
      relativePath: "release/app.tar.gz",
      bytes: new Uint8Array([1, 2, 3, 4]),
    });

    const windowsImport = await artifactBridge.importArtifact(artifact.artifactId, windows.sessionId);
    const macosImport = await artifactBridge.importArtifact(artifact.artifactId, macos.sessionId);

    expect(windowsImport).toMatchObject({ status: "imported", targetSessionId: "windows-session", hostFallbackAllowed: false });
    expect(macosImport).toMatchObject({ status: "imported", targetSessionId: "macos-session", hostFallbackAllowed: false });
    expect(macosImport.artifact.importedBySessionIds).toEqual(["windows-session", "macos-session"]);
    expect(imported).toEqual(["windows-session", "macos-session"]);
  });

  it("blocks imports until scan and approval gates pass", async () => {
    const source = session({});
    const target = session({ sessionId: "windows-session", guestOs: "windows" });
    const artifactBridge = bridge([source, target], {
      scanner: { scan: async () => ({ status: "pending" }) },
    });

    const pendingScan = await artifactBridge.export({
      missionId: source.missionId,
      sourceSessionId: source.sessionId,
      kind: "source_tree",
      name: "source.zip",
      relativePath: "handoff/source.zip",
      bytes: new Uint8Array([1]),
      requiresApproval: true,
    });
    const blockedForScan = await artifactBridge.importArtifact(pendingScan.artifactId, target.sessionId);
    expect(blockedForScan.reasons).toContain("Artifact scan has not passed.");
    expect(blockedForScan.reasons).toContain("Artifact transfer is pending approval.");

    const approvedBridge = bridge([source, target], { idFactory: () => "artifact-2" });
    const pendingApproval = await approvedBridge.export({
      missionId: source.missionId,
      sourceSessionId: source.sessionId,
      kind: "source_tree",
      name: "source.zip",
      relativePath: "handoff/source.zip",
      bytes: new Uint8Array([1]),
      requiresApproval: true,
    });
    expect((await approvedBridge.importArtifact(pendingApproval.artifactId, target.sessionId)).reasons).toContain("Artifact transfer is pending approval.");
    approvedBridge.approve(pendingApproval.artifactId);
    expect(await approvedBridge.importArtifact(pendingApproval.artifactId, target.sessionId)).toMatchObject({ status: "imported" });
  });

  it("rejects unsafe paths, empty exports, oversized transfers, and same-session imports", async () => {
    const source = session({});
    const artifactBridge = bridge([source], { maxArtifactBytes: 2 });

    await expect(artifactBridge.export({
      missionId: source.missionId,
      sourceSessionId: source.sessionId,
      kind: "log_bundle",
      name: "logs.zip",
      relativePath: "../logs.zip",
      bytes: new Uint8Array([1]),
    })).rejects.toThrow("inside the sandbox workspace");

    await expect(artifactBridge.export({
      missionId: source.missionId,
      sourceSessionId: source.sessionId,
      kind: "log_bundle",
      name: "logs.zip",
      relativePath: "logs.zip",
      bytes: new Uint8Array([]),
    })).rejects.toThrow("non-empty");

    await expect(artifactBridge.export({
      missionId: source.missionId,
      sourceSessionId: source.sessionId,
      kind: "log_bundle",
      name: "logs.zip",
      relativePath: "logs.zip",
      bytes: new Uint8Array([1, 2, 3]),
    })).rejects.toThrow("size limit");

    const validBridge = bridge([source]);
    const artifact = await validBridge.export({
      missionId: source.missionId,
      sourceSessionId: source.sessionId,
      kind: "log_bundle",
      name: "logs.zip",
      relativePath: "logs.zip",
      bytes: new Uint8Array([1]),
    });
    expect((await validBridge.importArtifact(artifact.artifactId, source.sessionId)).reasons).toContain("Artifact cannot be imported back into its source session.");
  });
});

