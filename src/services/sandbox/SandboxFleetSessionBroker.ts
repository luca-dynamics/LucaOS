import type {
  SandboxFleetBackend,
  SandboxFleetCommand,
  SandboxFleetCommandResult,
  SandboxFleetCreateSessionResult,
  SandboxFleetSession,
  SandboxFleetSessionCleanupResult,
  SandboxFleetSessionSnapshot,
  SandboxPlacementRequest,
} from "../../types/sandboxFleet";
import { SandboxFleetRegistry } from "./SandboxFleetRegistry";
import { SandboxFleetScheduler } from "./SandboxFleetScheduler";

export interface SandboxFleetRuntimeAdapter {
  create(input: {
    sessionId: string;
    missionId: string;
    backend: SandboxFleetBackend;
    imageId: string;
    capabilities: SandboxPlacementRequest["capabilities"];
    persistence: SandboxPlacementRequest["persistence"];
  }): Promise<{ runtimeRef: unknown }>;
  execute?(runtimeRef: unknown, command: SandboxFleetCommand): Promise<Omit<SandboxFleetCommandResult, "sessionId" | "startedAt" | "finishedAt">>;
  suspend?(runtimeRef: unknown): Promise<void>;
  resume?(runtimeRef: unknown): Promise<void>;
  snapshot?(runtimeRef: unknown): Promise<{ runtimeSnapshotRef?: unknown }>;
  destroy(runtimeRef: unknown): Promise<void>;
}

export class SandboxFleetSessionBroker {
  private readonly scheduler: SandboxFleetScheduler;
  private readonly sessions = new Map<string, SandboxFleetSession>();
  private readonly snapshots = new Map<string, SandboxFleetSessionSnapshot>();
  private readonly activeSessionByMission = new Map<string, string>();

  constructor(
    private readonly registry = new SandboxFleetRegistry(),
    private readonly adapters: Record<string, SandboxFleetRuntimeAdapter> = {},
    private readonly idFactory = () => crypto.randomUUID(),
    private readonly now = () => new Date().toISOString(),
    private readonly defaultEphemeralTtlMs = 60 * 60 * 1000,
  ) {
    this.scheduler = new SandboxFleetScheduler(registry);
  }

  async create(request: SandboxPlacementRequest): Promise<SandboxFleetCreateSessionResult> {
    const decision = this.scheduler.place(request);
    if (decision.status === "blocked" || !decision.backendId || !decision.imageId) {
      return { status: "blocked", decision, session: null };
    }

    const backend = this.registry.get(decision.backendId);
    if (!backend) return this.blocked(decision, "Placed sandbox backend disappeared before session creation.");

    const image = backend.images.find((candidate) => candidate.id === decision.imageId);
    if (!image) return this.blocked(decision, "Placed sandbox image disappeared before session creation.");

    const adapter = this.adapters[backend.backendId] ?? this.adapters[backend.kind];
    if (!adapter) return this.blocked(decision, "No runtime adapter is registered for the placed sandbox backend.");

    const sessionId = this.idFactory();
    const runtime = await adapter.create({
      sessionId,
      missionId: request.missionId,
      backend,
      imageId: image.id,
      capabilities: request.capabilities,
      persistence: request.persistence,
    });

    const timestamp = this.now();
    const expiresAt = request.persistence === "ephemeral"
      ? new Date(Date.parse(timestamp) + this.defaultEphemeralTtlMs).toISOString()
      : undefined;
    const session: SandboxFleetSession = {
      sessionId,
      missionId: request.missionId,
      status: "running",
      backendId: backend.backendId,
      backendKind: backend.kind,
      hostId: backend.hostId,
      hostPlatform: backend.hostPlatform,
      locality: backend.locality,
      isolationTier: backend.isolationTier,
      guestOs: image.guestOs,
      imageId: image.id,
      imageDigest: image.digest,
      capabilities: [...request.capabilities],
      persistence: request.persistence,
      runtimeRef: runtime.runtimeRef,
      createdAt: timestamp,
      updatedAt: timestamp,
      expiresAt,
      hostFallbackAllowed: false,
    };

    this.sessions.set(sessionId, session);
    this.registry.updateHealth(backend.backendId, {
      available: backend.available,
      activeSessions: backend.activeSessions + 1,
    });

    return { status: "created", decision, session: structuredClone(session) };
  }

  list(missionId?: string): SandboxFleetSession[] {
    return [...this.sessions.values()]
      .filter((session) => !missionId || session.missionId === missionId)
      .map((session) => structuredClone(session));
  }

  get(sessionId: string): SandboxFleetSession | undefined {
    const session = this.sessions.get(sessionId);
    return session ? structuredClone(session) : undefined;
  }

  activate(missionId: string, sessionId: string): SandboxFleetSession {
    const session = this.sessions.get(sessionId);
    if (!session || session.missionId !== missionId) throw new Error("Sandbox session does not belong to this mission.");
    if (session.status === "destroyed") throw new Error("Destroyed sandbox sessions cannot become active.");
    if (session.status === "expired") throw new Error("Expired sandbox sessions cannot become active.");
    this.activeSessionByMission.set(missionId, sessionId);
    return structuredClone(session);
  }

  getActiveSession(missionId: string): SandboxFleetSession | undefined {
    const sessionId = this.activeSessionByMission.get(missionId);
    return sessionId ? this.get(sessionId) : undefined;
  }

  listSnapshots(sessionId?: string): SandboxFleetSessionSnapshot[] {
    return [...this.snapshots.values()]
      .filter((snapshot) => !sessionId || snapshot.sessionId === sessionId)
      .map((snapshot) => structuredClone(snapshot));
  }

  async snapshot(sessionId: string): Promise<SandboxFleetSessionSnapshot> {
    const session = this.requireSession(sessionId);
    if (session.status === "destroyed" || session.status === "expired") {
      throw new Error("Inactive sandbox sessions cannot be snapshotted.");
    }
    const adapter = this.requireAdapter(session);
    const runtimeSnapshot = await adapter.snapshot?.(session.runtimeRef);
    const capturedAt = this.now();
    const snapshot: SandboxFleetSessionSnapshot = {
      snapshotId: this.idFactory(),
      sessionId: session.sessionId,
      missionId: session.missionId,
      status: session.status,
      backendId: session.backendId,
      backendKind: session.backendKind,
      guestOs: session.guestOs,
      imageId: session.imageId,
      imageDigest: session.imageDigest,
      persistence: session.persistence,
      createdAt: session.createdAt,
      capturedAt,
      expiresAt: session.expiresAt,
      runtimeSnapshotRef: runtimeSnapshot?.runtimeSnapshotRef,
      hostFallbackAllowed: false,
    };
    this.snapshots.set(snapshot.snapshotId, snapshot);
    this.sessions.set(sessionId, { ...session, lastSnapshotId: snapshot.snapshotId, updatedAt: capturedAt });
    return structuredClone(snapshot);
  }

  async execute(sessionId: string, command: SandboxFleetCommand): Promise<SandboxFleetCommandResult> {
    const session = this.requireSession(sessionId);
    if (session.status !== "running") throw new Error("Sandbox session is not running.");
    if (!session.capabilities.includes("terminal")) throw new Error("Sandbox session has no terminal capability.");

    const adapter = this.requireAdapter(session);
    if (!adapter.execute) throw new Error("Sandbox runtime adapter cannot execute commands.");

    const startedAt = this.now();
    const result = await adapter.execute(session.runtimeRef, {
      executable: command.executable,
      args: [...command.args],
      timeoutMs: command.timeoutMs,
    });
    return { sessionId, startedAt, finishedAt: this.now(), ...result };
  }

  async suspend(sessionId: string): Promise<SandboxFleetSession> {
    const session = this.requireSession(sessionId);
    if (session.status !== "running") throw new Error("Only running sandbox sessions can be suspended.");
    const adapter = this.requireAdapter(session);
    await adapter.suspend?.(session.runtimeRef);
    return this.updateSessionStatus(session, "suspended");
  }

  async resume(sessionId: string): Promise<SandboxFleetSession> {
    const session = this.requireSession(sessionId);
    if (session.status !== "suspended") throw new Error("Only suspended sandbox sessions can be resumed.");
    const adapter = this.requireAdapter(session);
    await adapter.resume?.(session.runtimeRef);
    return this.updateSessionStatus(session, "running");
  }

  async destroy(sessionId: string): Promise<{ destroyed: boolean; sessionId: string }> {
    const session = this.requireSession(sessionId);
    const adapter = this.requireAdapter(session);
    await adapter.destroy(session.runtimeRef);

    this.sessions.delete(sessionId);
    if (this.activeSessionByMission.get(session.missionId) === sessionId) {
      this.activeSessionByMission.delete(session.missionId);
    }

    this.releaseBackendCapacity(session.backendId);

    return { destroyed: true, sessionId };
  }

  async expireDueSessions(): Promise<SandboxFleetSessionSnapshot[]> {
    const nowMs = Date.parse(this.now());
    const expired: SandboxFleetSessionSnapshot[] = [];
    for (const session of [...this.sessions.values()]) {
      if ((session.status === "running" || session.status === "suspended") && session.expiresAt && Date.parse(session.expiresAt) <= nowMs) {
        const snapshot = await this.snapshot(session.sessionId);
        const updated = { ...this.requireSession(session.sessionId), status: "expired" as const, updatedAt: this.now() };
        this.sessions.set(session.sessionId, updated);
        if (this.activeSessionByMission.get(session.missionId) === session.sessionId) {
          this.activeSessionByMission.delete(session.missionId);
        }
        expired.push(snapshot);
      }
    }
    return expired;
  }

  async cleanupExpiredSessions(): Promise<SandboxFleetSessionCleanupResult[]> {
    const nowMs = Date.parse(this.now());
    const cleaned: SandboxFleetSessionCleanupResult[] = [];
    for (const session of [...this.sessions.values()]) {
      const due = session.expiresAt && Date.parse(session.expiresAt) <= nowMs;
      if (!due && session.status !== "expired") continue;

      const snapshot = session.status === "expired" && session.lastSnapshotId
        ? this.snapshots.get(session.lastSnapshotId) ?? await this.snapshot(session.sessionId)
        : await this.snapshot(session.sessionId);
      const adapter = this.requireAdapter(session);
      await adapter.destroy(session.runtimeRef);
      this.sessions.delete(session.sessionId);
      if (this.activeSessionByMission.get(session.missionId) === session.sessionId) {
        this.activeSessionByMission.delete(session.missionId);
      }
      this.releaseBackendCapacity(session.backendId);

      cleaned.push({
        sessionId: session.sessionId,
        missionId: session.missionId,
        backendId: session.backendId,
        snapshotId: snapshot.snapshotId,
        destroyed: true,
        cleanedAt: this.now(),
        hostFallbackAllowed: false,
      });
    }
    return cleaned;
  }

  private blocked(decision: SandboxFleetCreateSessionResult["decision"], reason: string): SandboxFleetCreateSessionResult {
    return {
      status: "blocked",
      decision: { ...decision, status: "blocked", reasons: [...decision.reasons, reason], hostFallbackAllowed: false },
      session: null,
    };
  }

  private requireSession(sessionId: string): SandboxFleetSession {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Sandbox session not found.");
    return session;
  }

  private requireAdapter(session: SandboxFleetSession): SandboxFleetRuntimeAdapter {
    const adapter = this.adapters[session.backendId] ?? this.adapters[session.backendKind];
    if (!adapter) throw new Error("Sandbox runtime adapter is not registered.");
    return adapter;
  }

  private releaseBackendCapacity(backendId: string): void {
    const backend = this.registry.get(backendId);
    if (!backend) return;
    this.registry.updateHealth(backend.backendId, {
      available: backend.available,
      activeSessions: Math.max(0, backend.activeSessions - 1),
    });
  }

  private updateSessionStatus(
    session: SandboxFleetSession,
    status: SandboxFleetSession["status"],
  ): SandboxFleetSession {
    const updated = { ...session, status, updatedAt: this.now() };
    this.sessions.set(session.sessionId, updated);
    return structuredClone(updated);
  }
}
