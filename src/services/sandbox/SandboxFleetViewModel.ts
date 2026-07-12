import type {
  SandboxArtifactRecord,
  SandboxFleetBackend,
  SandboxFleetOperatorView,
  SandboxFleetSession,
  SandboxFleetSessionSnapshot,
} from "../../types/sandboxFleet";

export interface SandboxFleetViewModelInput {
  missionId?: string;
  backends: SandboxFleetBackend[];
  sessions: SandboxFleetSession[];
  artifacts?: SandboxArtifactRecord[];
  snapshots?: SandboxFleetSessionSnapshot[];
  activeSessionIdByMission?: Record<string, string | undefined>;
  now?: string;
}

export class SandboxFleetViewModel {
  build(input: SandboxFleetViewModelInput): SandboxFleetOperatorView {
    const nowMs = Date.parse(input.now ?? new Date().toISOString());
    const missionSessions = input.sessions.filter((session) => !input.missionId || session.missionId === input.missionId);
    const missionArtifacts = (input.artifacts ?? []).filter((artifact) => !input.missionId || artifact.missionId === input.missionId);
    const missionSnapshots = (input.snapshots ?? []).filter((snapshot) => !input.missionId || snapshot.missionId === input.missionId);

    return {
      missionId: input.missionId,
      backends: input.backends.map((backend) => {
        const remainingSlots = Math.max(0, backend.capacity - backend.activeSessions);
        return {
          backendId: backend.backendId,
          kind: backend.kind,
          hostId: backend.hostId,
          hostPlatform: backend.hostPlatform,
          locality: backend.locality,
          isolationTier: backend.isolationTier,
          available: backend.available,
          trust: backend.trust,
          capacity: backend.capacity,
          activeSessions: backend.activeSessions,
          remainingSlots,
          guestOs: [...backend.guestOs],
          capabilities: [...backend.capabilities],
          blockedReason: this.backendBlockedReason(backend, remainingSlots),
        };
      }),
      sessions: missionSessions.map((session) => {
        const active = input.activeSessionIdByMission?.[session.missionId] === session.sessionId;
        const expired = session.status === "expired" || Boolean(session.expiresAt && Date.parse(session.expiresAt) <= nowMs);
        return {
          sessionId: session.sessionId,
          missionId: session.missionId,
          status: session.status,
          backendId: session.backendId,
          guestOs: session.guestOs,
          imageId: session.imageId,
          persistence: session.persistence,
          active,
          switchable: !expired && session.status !== "destroyed",
          emergencyDestroyAllowed: session.status !== "destroyed",
          expiresAt: session.expiresAt,
          expired,
          needsCleanup: expired && session.status !== "destroyed",
          lastSnapshotId: session.lastSnapshotId,
        };
      }),
      artifacts: missionArtifacts.map((artifact) => ({
        artifactId: artifact.artifactId,
        missionId: artifact.missionId,
        sourceSessionId: artifact.sourceSessionId,
        kind: artifact.kind,
        name: artifact.name,
        digest: artifact.digest,
        scanStatus: artifact.scanStatus,
        approvalStatus: artifact.approvalStatus,
        importCount: artifact.importedBySessionIds.length,
        blockedReason: this.artifactBlockedReason(artifact),
      })),
      snapshots: missionSnapshots.map((snapshot) => structuredClone(snapshot)),
      cleanupCount: missionSessions.filter((session) => {
        const expired = session.status === "expired" || Boolean(session.expiresAt && Date.parse(session.expiresAt) <= nowMs);
        return expired && session.status !== "destroyed";
      }).length,
      hostFallbackAllowed: false,
    };
  }

  private backendBlockedReason(backend: SandboxFleetBackend, remainingSlots: number): string | undefined {
    if (!backend.available) return "Backend is unavailable.";
    if (backend.trust === "unverified") return "Backend trust is unverified.";
    if (remainingSlots <= 0) return "Backend capacity is full.";
    return undefined;
  }

  private artifactBlockedReason(artifact: SandboxArtifactRecord): string | undefined {
    if (artifact.scanStatus !== "passed") return "Artifact scan has not passed.";
    if (artifact.approvalStatus === "pending") return "Artifact transfer is pending approval.";
    if (artifact.approvalStatus === "rejected") return "Artifact transfer was rejected.";
    return undefined;
  }
}

