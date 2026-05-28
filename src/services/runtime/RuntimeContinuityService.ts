import { eventBus } from "../eventBus";
import type { RuntimeContinuitySnapshot, RuntimeContinuitySummary, RuntimeLifecycleState } from "../../types/runtimeContinuity";

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; }
const STORAGE_KEY = "LUCA_RUNTIME_CONTINUITY_SNAPSHOT_V1";

function nowIso(): string { return new Date().toISOString(); }
function storage(): StorageLike | undefined {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof localStorage !== "undefined") return localStorage;
  return undefined;
}

export class RuntimeContinuityService {
  constructor(private readonly backingStorage: StorageLike | undefined = storage()) {}

  createSnapshot(input: Partial<RuntimeContinuitySnapshot> = {}): RuntimeContinuitySnapshot {
    const timestamp = nowIso();
    const snapshot: RuntimeContinuitySnapshot = {
      runtimeId: input.runtimeId ?? `runtime:${timestamp}`,
      sessionId: input.sessionId ?? `session:${timestamp}`,
      lifecycleState: input.lifecycleState ?? "stopped",
      activeMode: input.activeMode ?? "unknown",
      activeModelRouteSummary: input.activeModelRouteSummary ?? "Model route not summarized yet.",
      activeMemoryRouteSummary: input.activeMemoryRouteSummary ?? "Memory route not summarized yet.",
      activeToolScopes: input.activeToolScopes ? [...input.activeToolScopes] : [],
      pendingApprovalCount: input.pendingApprovalCount ?? 0,
      deliveredReminderCount: input.deliveredReminderCount ?? 0,
      scheduledJobCount: input.scheduledJobCount ?? 0,
      quarantinedItemCount: input.quarantinedItemCount ?? 0,
      lastHeartbeatAt: input.lastHeartbeatAt,
      lastResumedAt: input.lastResumedAt,
      restartReason: input.restartReason,
      degradedReasons: input.degradedReasons ? [...input.degradedReasons] : [],
      createdAt: input.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    this.persistSnapshot(snapshot);
    this.publish(snapshot, "created");
    return snapshot;
  }

  readSnapshot(): RuntimeContinuitySnapshot | null {
    if (!this.backingStorage) return null;
    try {
      const raw = this.backingStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as RuntimeContinuitySnapshot;
      if (!parsed.runtimeId || !parsed.sessionId) return null;
      return { ...parsed, activeToolScopes: parsed.activeToolScopes ?? [], degradedReasons: parsed.degradedReasons ?? [] };
    } catch {
      return null;
    }
  }

  updateSnapshot(update: Partial<RuntimeContinuitySnapshot>): RuntimeContinuitySnapshot {
    const current = this.readSnapshot() ?? this.createSnapshot();
    const snapshot: RuntimeContinuitySnapshot = {
      ...current,
      ...update,
      activeToolScopes: update.activeToolScopes ? [...update.activeToolScopes] : current.activeToolScopes,
      degradedReasons: update.degradedReasons ? [...update.degradedReasons] : current.degradedReasons,
      createdAt: current.createdAt,
      updatedAt: nowIso(),
    };
    this.persistSnapshot(snapshot);
    this.publish(snapshot, "updated");
    return snapshot;
  }

  transitionLifecycleState(lifecycleState: RuntimeLifecycleState, reason?: string): RuntimeContinuitySnapshot {
    const degradedReasons = lifecycleState === "degraded" && reason ? [reason] : undefined;
    return this.updateSnapshot({ lifecycleState, degradedReasons, restartReason: reason });
  }

  recordHeartbeat(): RuntimeContinuitySnapshot {
    return this.updateSnapshot({ lastHeartbeatAt: nowIso() });
  }

  markResumed(restartReason?: string): RuntimeContinuitySnapshot {
    return this.updateSnapshot({ lifecycleState: "idle", lastResumedAt: nowIso(), restartReason });
  }

  getDiagnosticsSummary(snapshot: RuntimeContinuitySnapshot | null = this.readSnapshot()): RuntimeContinuitySummary {
    if (!snapshot) {
      return {
        runtimeId: "not-created",
        sessionId: "not-created",
        lifecycleState: "stopped",
        canSafelyResume: true,
        userSafeStatus: "Runtime continuity is ready to initialize; no background actions are enabled.",
        pendingApprovalCount: 0,
        deliveredReminderCount: 0,
        scheduledJobCount: 0,
        quarantinedItemCount: 0,
        degradedReasons: [],
        activeMode: "unknown",
      };
    }
    const blocked = snapshot.lifecycleState === "quarantined" || snapshot.quarantinedItemCount > 0;
    const degraded = snapshot.lifecycleState === "degraded" || snapshot.degradedReasons.length > 0;
    return {
      runtimeId: snapshot.runtimeId,
      sessionId: snapshot.sessionId,
      lifecycleState: snapshot.lifecycleState,
      canSafelyResume: !blocked,
      userSafeStatus: blocked
        ? "Runtime resume is paused because quarantined items need review."
        : degraded
          ? "Runtime continuity can resume in degraded mode after review."
          : "Runtime continuity snapshot is safe to resume; no autonomous execution is enabled.",
      pendingApprovalCount: snapshot.pendingApprovalCount,
      deliveredReminderCount: snapshot.deliveredReminderCount ?? 0,
      scheduledJobCount: snapshot.scheduledJobCount,
      quarantinedItemCount: snapshot.quarantinedItemCount,
      degradedReasons: [...snapshot.degradedReasons],
      activeMode: snapshot.activeMode,
      lastHeartbeatAt: snapshot.lastHeartbeatAt,
      lastResumedAt: snapshot.lastResumedAt,
    };
  }

  private persistSnapshot(snapshot: RuntimeContinuitySnapshot): void {
    this.backingStorage?.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }

  private publish(snapshot: RuntimeContinuitySnapshot, action: "created" | "updated"): void {
    eventBus.emitEvent?.({
      type: "runtime-continuity",
      message: `Runtime continuity snapshot ${action}`,
      priority: "LOW",
      context: { runtimeId: snapshot.runtimeId, lifecycleState: snapshot.lifecycleState, timestamp: Date.now() },
    });
  }
}

export const runtimeContinuityService = new RuntimeContinuityService();
