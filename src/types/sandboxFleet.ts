import type { SandboxBackendKind, SandboxCapability, SandboxSessionPersistence } from "./sandboxHost";

export type SandboxGuestOs = "linux" | "windows" | "macos";
export type SandboxHostPlatform = "windows" | "macos" | "linux";
export type SandboxIsolationTier = "container" | "vm" | "microvm" | "remote_vm";
export type SandboxLocality = "local" | "paired_host" | "remote";

export interface SandboxFleetBackend {
  backendId: string;
  kind: SandboxBackendKind | "podman" | "firecracker" | "apple_virtualization" | "hyperv";
  hostId: string;
  hostPlatform: SandboxHostPlatform;
  locality: SandboxLocality;
  isolationTier: SandboxIsolationTier;
  guestOs: SandboxGuestOs[];
  images: Array<{
    id: string;
    guestOs: SandboxGuestOs;
    distribution?: string;
    version?: string;
    architecture: "x64" | "arm64";
    digest: string;
  }>;
  capabilities: SandboxCapability[];
  available: boolean;
  capacity: number;
  activeSessions: number;
  appleHardware: boolean;
  trust: "local_trusted" | "paired_trusted" | "remote_attested" | "unverified";
}

export interface SandboxPlacementRequest {
  missionId: string;
  guestOs: SandboxGuestOs;
  distribution?: string;
  version?: string;
  architecture: "x64" | "arm64";
  isolationTiers: SandboxIsolationTier[];
  locality: SandboxLocality | "any";
  capabilities: SandboxCapability[];
  persistence: SandboxSessionPersistence;
  requiresAppleHardware?: boolean;
}

export interface SandboxPlacementDecision {
  status: "placed" | "blocked";
  missionId: string;
  backendId: string | null;
  imageId: string | null;
  reasons: string[];
  hostFallbackAllowed: false;
}

export type SandboxFleetSessionStatus = "running" | "suspended" | "expired" | "destroyed";

export interface SandboxFleetCommand {
  executable: string;
  args: string[];
  timeoutMs?: number;
}

export interface SandboxFleetCommandResult {
  sessionId: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  startedAt: string;
  finishedAt: string;
}

export interface SandboxFleetSession {
  sessionId: string;
  missionId: string;
  status: SandboxFleetSessionStatus;
  backendId: string;
  backendKind: SandboxFleetBackend["kind"];
  hostId: string;
  hostPlatform: SandboxHostPlatform;
  locality: SandboxLocality;
  isolationTier: SandboxIsolationTier;
  guestOs: SandboxGuestOs;
  imageId: string;
  imageDigest: string;
  capabilities: SandboxCapability[];
  persistence: SandboxSessionPersistence;
  runtimeRef: unknown;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  lastSnapshotId?: string;
  hostFallbackAllowed: false;
}

export interface SandboxFleetCreateSessionResult {
  status: "created" | "blocked";
  decision: SandboxPlacementDecision;
  session: SandboxFleetSession | null;
}

export interface SandboxFleetSessionSnapshot {
  snapshotId: string;
  sessionId: string;
  missionId: string;
  status: SandboxFleetSessionStatus;
  backendId: string;
  backendKind: SandboxFleetBackend["kind"];
  guestOs: SandboxGuestOs;
  imageId: string;
  imageDigest: string;
  persistence: SandboxSessionPersistence;
  createdAt: string;
  capturedAt: string;
  expiresAt?: string;
  runtimeSnapshotRef?: unknown;
  hostFallbackAllowed: false;
}

export type SandboxArtifactKind = "source_tree" | "build_output" | "test_report" | "package" | "log_bundle";
export type SandboxArtifactScanStatus = "pending" | "passed" | "failed";
export type SandboxArtifactApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

export interface SandboxArtifactExportRequest {
  missionId: string;
  sourceSessionId: string;
  kind: SandboxArtifactKind;
  name: string;
  relativePath: string;
  bytes: Uint8Array;
  mediaType?: string;
  requiresApproval?: boolean;
}

export interface SandboxArtifactRecord {
  artifactId: string;
  missionId: string;
  sourceSessionId: string;
  sourceGuestOs: SandboxGuestOs;
  sourceImageId: string;
  sourceImageDigest: string;
  kind: SandboxArtifactKind;
  name: string;
  relativePath: string;
  mediaType?: string;
  sizeBytes: number;
  digest: string;
  scanStatus: SandboxArtifactScanStatus;
  approvalStatus: SandboxArtifactApprovalStatus;
  createdAt: string;
  importedBySessionIds: string[];
  provenance: {
    sourceBackendId: string;
    sourceHostId: string;
    sourceHostPlatform: SandboxHostPlatform;
    sourceIsolationTier: SandboxIsolationTier;
  };
  immutable: true;
  hostFallbackAllowed: false;
}

export interface SandboxArtifactImportResult {
  status: "imported" | "blocked";
  artifact: SandboxArtifactRecord;
  targetSessionId: string;
  reasons: string[];
  importedAt?: string;
  hostFallbackAllowed: false;
}

export type SandboxHostCapability =
  | "host_file_read"
  | "host_file_write"
  | "display_capture"
  | "ui_input"
  | "credential_access"
  | "signing_key"
  | "luca_link_device";

export type SandboxHostCapabilityRequestStatus = "pending" | "approved" | "rejected" | "consumed" | "expired";

export interface SandboxHostCapabilityRequest {
  requestId: string;
  missionId: string;
  sessionId: string;
  capability: SandboxHostCapability;
  reason: string;
  scope: Record<string, string | number | boolean>;
  status: SandboxHostCapabilityRequestStatus;
  createdAt: string;
  expiresAt: string;
  decidedAt?: string;
  consumedAt?: string;
  hostFallbackAllowed: false;
}

export interface SandboxRemoteWorkerDescriptor {
  workerId: string;
  hostId: string;
  hostPlatform: SandboxHostPlatform;
  locality: "paired_host" | "remote";
  isolationTier: SandboxIsolationTier;
  appleHardware: boolean;
  trust: SandboxFleetBackend["trust"];
  capacity: number;
  guestOs: SandboxGuestOs[];
  capabilities: SandboxCapability[];
  images: SandboxFleetBackend["images"];
  attestationDigest?: string;
}
