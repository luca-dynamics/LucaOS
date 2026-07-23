import type {
  SandboxArtifactApprovalStatus,
  SandboxArtifactExportRequest,
  SandboxArtifactImportResult,
  SandboxArtifactRecord,
  SandboxArtifactScanStatus,
  SandboxFleetSession,
} from "../../types/sandboxFleet";

export interface SandboxArtifactSessionProvider {
  get(sessionId: string): SandboxFleetSession | undefined;
}

export interface SandboxArtifactScanner {
  scan(input: { artifactId: string; bytes: Uint8Array; digest: string }): Promise<{
    status: SandboxArtifactScanStatus;
    reason?: string;
  }>;
}

export interface SandboxArtifactImporter {
  import(input: {
    artifact: SandboxArtifactRecord;
    targetSession: SandboxFleetSession;
  }): Promise<void>;
}

export class SandboxArtifactBridge {
  private readonly artifacts = new Map<string, { record: SandboxArtifactRecord; bytes: Uint8Array }>();

  constructor(
    private readonly sessions: SandboxArtifactSessionProvider,
    private readonly options: {
      scanner?: SandboxArtifactScanner;
      importer?: SandboxArtifactImporter;
      maxArtifactBytes?: number;
      digest?: (bytes: Uint8Array) => Promise<string>;
      idFactory?: () => string;
      now?: () => string;
    } = {},
  ) {}

  async export(request: SandboxArtifactExportRequest): Promise<SandboxArtifactRecord> {
    const sourceSession = this.requireSession(request.sourceSessionId);
    if (sourceSession.missionId !== request.missionId) throw new Error("Artifact source session does not belong to this mission.");
    if (sourceSession.status !== "running" && sourceSession.status !== "suspended") {
      throw new Error("Artifact source session is not exportable.");
    }

    const name = this.normalizeName(request.name);
    const relativePath = this.normalizeRelativePath(request.relativePath);
    const sizeBytes = request.bytes.byteLength;
    const maxArtifactBytes = this.options.maxArtifactBytes ?? 128 * 1024 * 1024;
    if (sizeBytes <= 0) throw new Error("Artifact export requires non-empty bytes.");
    if (sizeBytes > maxArtifactBytes) throw new Error("Artifact exceeds the sandbox transfer size limit.");

    const artifactId = this.options.idFactory?.() ?? crypto.randomUUID();
    const digest = await this.digest(request.bytes);
    const scan = await this.scan(artifactId, request.bytes, digest);
    const approvalStatus: SandboxArtifactApprovalStatus = request.requiresApproval ? "pending" : "not_required";

    const createdAt = this.now();
    const record: SandboxArtifactRecord = {
      artifactId,
      missionId: request.missionId,
      sourceSessionId: sourceSession.sessionId,
      sourceGuestOs: sourceSession.guestOs,
      sourceImageId: sourceSession.imageId,
      sourceImageDigest: sourceSession.imageDigest,
      kind: request.kind,
      name,
      relativePath,
      mediaType: request.mediaType,
      sizeBytes,
      digest,
      scanStatus: scan.status,
      approvalStatus,
      createdAt,
      importedBySessionIds: [],
      provenance: {
        sourceBackendId: sourceSession.backendId,
        sourceHostId: sourceSession.hostId,
        sourceHostPlatform: sourceSession.hostPlatform,
        sourceIsolationTier: sourceSession.isolationTier,
      },
      immutable: true,
      hostFallbackAllowed: false,
    };

    this.artifacts.set(artifactId, { record, bytes: new Uint8Array(request.bytes) });
    return structuredClone(record);
  }

  list(missionId?: string): SandboxArtifactRecord[] {
    return [...this.artifacts.values()]
      .filter(({ record }) => !missionId || record.missionId === missionId)
      .map(({ record }) => structuredClone(record));
  }

  get(artifactId: string): SandboxArtifactRecord | undefined {
    const stored = this.artifacts.get(artifactId);
    return stored ? structuredClone(stored.record) : undefined;
  }

  approve(artifactId: string): SandboxArtifactRecord {
    return this.updateApproval(artifactId, "approved");
  }

  reject(artifactId: string): SandboxArtifactRecord {
    return this.updateApproval(artifactId, "rejected");
  }

  async importArtifact(artifactId: string, targetSessionId: string): Promise<SandboxArtifactImportResult> {
    const stored = this.artifacts.get(artifactId);
    if (!stored) throw new Error("Sandbox artifact not found.");

    const targetSession = this.requireSession(targetSessionId);
    const reasons = this.importBlockers(stored.record, targetSession);
    if (reasons.length > 0) {
      return {
        status: "blocked",
        artifact: structuredClone(stored.record),
        targetSessionId,
        reasons,
        hostFallbackAllowed: false,
      };
    }

    await this.options.importer?.import({ artifact: structuredClone(stored.record), targetSession: structuredClone(targetSession) });

    const importedAt = this.now();
    const nextRecord = {
      ...stored.record,
      importedBySessionIds: [...new Set([...stored.record.importedBySessionIds, targetSessionId])],
    };
    this.artifacts.set(artifactId, { record: nextRecord, bytes: stored.bytes });

    return {
      status: "imported",
      artifact: structuredClone(nextRecord),
      targetSessionId,
      reasons: [],
      importedAt,
      hostFallbackAllowed: false,
    };
  }

  private importBlockers(artifact: SandboxArtifactRecord, targetSession: SandboxFleetSession): string[] {
    const reasons: string[] = [];
    if (targetSession.missionId !== artifact.missionId) reasons.push("Artifact and target session belong to different missions.");
    if (targetSession.sessionId === artifact.sourceSessionId) reasons.push("Artifact cannot be imported back into its source session.");
    if (targetSession.status !== "running") reasons.push("Target sandbox session is not running.");
    if (!targetSession.capabilities.includes("workspace_write")) reasons.push("Target sandbox session has no workspace write capability.");
    if (artifact.scanStatus !== "passed") reasons.push("Artifact scan has not passed.");
    if (artifact.approvalStatus === "pending") reasons.push("Artifact transfer is pending approval.");
    if (artifact.approvalStatus === "rejected") reasons.push("Artifact transfer was rejected.");
    return reasons;
  }

  private async scan(artifactId: string, bytes: Uint8Array, digest: string): Promise<{ status: SandboxArtifactScanStatus }> {
    if (!this.options.scanner) return { status: "pending" };
    return this.options.scanner.scan({ artifactId, bytes: new Uint8Array(bytes), digest });
  }

  private updateApproval(artifactId: string, approvalStatus: Exclude<SandboxArtifactApprovalStatus, "pending" | "not_required">): SandboxArtifactRecord {
    const stored = this.artifacts.get(artifactId);
    if (!stored) throw new Error("Sandbox artifact not found.");
    if (stored.record.approvalStatus === "not_required") throw new Error("Sandbox artifact does not require approval.");
    const record = { ...stored.record, approvalStatus };
    this.artifacts.set(artifactId, { ...stored, record });
    return structuredClone(record);
  }

  private requireSession(sessionId: string): SandboxFleetSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Sandbox session not found.");
    return session;
  }

  private normalizeName(name: string): string {
    const normalized = name.trim();
    if (!normalized) throw new Error("Artifact name is required.");
    if (normalized.includes("/") || normalized.includes("\\")) throw new Error("Artifact name must not contain path separators.");
    return normalized;
  }

  private normalizeRelativePath(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, "/").trim();
    if (!normalized || normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) {
      throw new Error("Artifact path must be relative.");
    }
    if (normalized.split("/").some((part: string) => part === ".." || part === "")) {
      throw new Error("Artifact path must stay inside the sandbox workspace.");
    }
    return normalized;
  }

  private async digest(bytes: Uint8Array): Promise<string> {
    if (this.options.digest) return this.options.digest(new Uint8Array(bytes));
    const digestInput = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(digestInput).set(bytes);
    const digest = await crypto.subtle.digest("SHA-256", digestInput);
    return `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }

  private now(): string {
    return this.options.now?.() ?? new Date().toISOString();
  }
}
