import { eventBus } from "../eventBus";
import { memoryGovernanceService } from "../memory/MemoryGovernanceService";
import { provenanceGateService } from "../provenance/ProvenanceGateService";
import { schedulerRegistryService } from "../scheduler/SchedulerRegistryService";
import type { SchedulerDiagnosticsSummary, SchedulerDryRunResult } from "../../types/scheduler";
import type { MemoryGovernanceDiagnosticsSummary } from "../../types/memoryGovernance";
import type { ProvenanceDiagnosticsSummary } from "../../types/provenance";
import type {
  RuntimeContinuityEventEnvelope,
  RuntimeContinuityEventType,
  RuntimeContinuityLoopStatus,
  RuntimeContinuitySnapshot,
  RuntimeLifecycleState,
} from "../../types/runtimeContinuity";
import { runtimeContinuityService, RuntimeContinuityService } from "./RuntimeContinuityService";

export interface RuntimeContinuityLoopStartOptions {
  intervalMs?: number;
  reason?: string;
  runImmediateTick?: boolean;
}

type LoopListener = (status: RuntimeContinuityLoopStatus) => void;

type TimerHandle = ReturnType<typeof setInterval>;

interface RuntimeContinuityLoopDependencies {
  continuity: RuntimeContinuityService;
  scheduler: Pick<
    typeof schedulerRegistryService,
    "detectDueJobsDryRun" | "getDiagnosticsSummary"
  >;
  provenance: Pick<typeof provenanceGateService, "getDiagnosticsSummary">;
  memoryGovernance: Pick<typeof memoryGovernanceService, "getDiagnosticsSummary">;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
  setIntervalFn: typeof setInterval;
  clearIntervalFn: typeof clearInterval;
  now: () => Date;
}

const DEFAULT_INTERVAL_MS = 60_000;
const LOOP_SOURCE = "runtime-continuity-loop";
const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9_-]{8,}/g,
  /sk-ant-[A-Za-z0-9_-]{8,}/g,
  /AIza[A-Za-z0-9_-]{12,}/g,
  /gh[pousr]_[A-Za-z0-9_]{12,}/g,
];

function sanitizeString(value: string): string {
  return SECRET_PATTERNS.reduce((current, pattern) => current.replace(pattern, "[redacted]"), value);
}

function safeMetadata(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (/secret|token|key|password/i.test(key)) return [key, "[redacted]"];
      if (typeof item === "string") return [key, sanitizeString(item)];
      if (Array.isArray(item)) {
        return [key, item.map((entry) => (typeof entry === "string" ? sanitizeString(entry) : entry))];
      }
      return [key, item];
    }),
  );
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export class RuntimeContinuityLoopService {
  private intervalId: TimerHandle | undefined;
  private intervalMs = DEFAULT_INTERVAL_MS;
  private inFlight = false;
  private disposed = false;
  private listeners = new Set<LoopListener>();
  private status: RuntimeContinuityLoopStatus;
  private dueDryRunJobs: SchedulerDryRunResult[] = [];

  constructor(private readonly deps: RuntimeContinuityLoopDependencies = {
    continuity: runtimeContinuityService,
    scheduler: schedulerRegistryService,
    provenance: provenanceGateService,
    memoryGovernance: memoryGovernanceService,
    bus: eventBus,
    setIntervalFn: setInterval,
    clearIntervalFn: clearInterval,
    now: () => new Date(),
  }) {
    const snapshot = this.deps.continuity.readSnapshot();
    this.status = this.statusFromSnapshot(snapshot, snapshot?.lifecycleState ?? "stopped");
  }

  start(options: RuntimeContinuityLoopStartOptions = {}): RuntimeContinuityLoopStatus {
    this.disposed = false;
    this.intervalMs = options.intervalMs ?? this.intervalMs ?? DEFAULT_INTERVAL_MS;
    const snapshot = this.ensureSnapshot();
    this.setStatus({
      ...this.statusFromSnapshot(snapshot, "starting"),
      intervalMs: this.intervalMs,
      dryRunOnly: true,
      lastReason: options.reason ?? "start",
    });

    const heartbeat = this.deps.continuity.recordHeartbeat();
    this.emitEnvelope("heartbeat", heartbeat, "Runtime continuity heartbeat recorded.", {
      reason: options.reason ?? "start",
      dryRunOnly: true,
    });

    this.deps.continuity.transitionLifecycleState("idle", options.reason ?? "start");
    this.ensureInterval();
    this.refreshStatusFromSnapshot(this.deps.continuity.readSnapshot(), "idle", options.reason ?? "start");

    if (options.runImmediateTick) void this.tick();
    return this.getLoopStatus();
  }

  resume(reason = "resume"): RuntimeContinuityLoopStatus {
    this.disposed = false;
    const snapshot = this.ensureSnapshot();
    this.setStatus({
      ...this.statusFromSnapshot(snapshot, "resuming"),
      intervalMs: this.intervalMs,
      dryRunOnly: true,
      lastReason: reason,
    });
    const resumed = this.deps.continuity.markResumed(reason);
    this.emitEnvelope("resumed", resumed, "Runtime continuity resumed in dry-run observation mode.", {
      reason,
      dryRunOnly: true,
    });
    return this.start({ intervalMs: this.intervalMs, reason, runImmediateTick: true });
  }

  pause(reason = "paused"): RuntimeContinuityLoopStatus {
    this.clearInterval();
    const snapshot = this.deps.continuity.transitionLifecycleState("stopped", reason);
    this.emitEnvelope("paused", snapshot, "Runtime continuity loop paused.", { reason, dryRunOnly: true });
    this.refreshStatusFromSnapshot(snapshot, "stopped", reason);
    return this.getLoopStatus();
  }

  stop(reason = "stopped"): RuntimeContinuityLoopStatus {
    this.setStatus({ ...this.status, lifecycleState: "stopping", running: false, lastReason: reason });
    this.clearInterval();
    const snapshot = this.deps.continuity.transitionLifecycleState("stopped", reason);
    this.emitEnvelope("stopped", snapshot, "Runtime continuity loop stopped.", { reason, dryRunOnly: true });
    this.refreshStatusFromSnapshot(snapshot, "stopped", reason);
    return this.getLoopStatus();
  }

  async tick(): Promise<RuntimeContinuityLoopStatus> {
    if (this.inFlight) {
      this.setStatus({ ...this.status, inFlight: true });
      return this.getLoopStatus();
    }

    this.inFlight = true;
    this.setStatus({ ...this.status, inFlight: true, dryRunOnly: true });
    const tickAt = this.deps.now().toISOString();

    try {
      const snapshot = this.ensureSnapshot();
      const heartbeat = this.deps.continuity.recordHeartbeat();
      this.emitEnvelope("heartbeat", heartbeat, "Runtime continuity heartbeat recorded.", { dryRunOnly: true });

      const dueDryRuns = this.deps.scheduler.detectDueJobsDryRun(tickAt);
      this.dueDryRunJobs = dueDryRuns.filter((run) => run.due);
      const schedulerSummary = this.deps.scheduler.getDiagnosticsSummary(tickAt);
      const provenanceSummary = this.deps.provenance.getDiagnosticsSummary();
      const memorySummary = this.deps.memoryGovernance.getDiagnosticsSummary();
      const pendingApprovalCount = this.pendingApprovalCount(schedulerSummary, provenanceSummary, dueDryRuns);
      const quarantinedItemCount = this.quarantinedItemCount(schedulerSummary, provenanceSummary, memorySummary);
      const degradedReasons = this.degradedReasons(schedulerSummary, provenanceSummary, memorySummary, dueDryRuns);
      const lifecycleState = quarantinedItemCount > 0
        ? "quarantined"
        : degradedReasons.length > 0
          ? "degraded"
          : "idle";

      const updated = this.deps.continuity.updateSnapshot({
        lifecycleState,
        scheduledJobCount: schedulerSummary.totalJobs,
        pendingApprovalCount,
        quarantinedItemCount,
        degradedReasons,
        lastHeartbeatAt: heartbeat.lastHeartbeatAt,
      });

      this.emitEnvelope("dry_run_tick", updated, "Scheduler dry-run tick completed without executing jobs.", {
        dueDryRunJobs: this.dueDryRunJobs.length,
        schedulerJobCount: schedulerSummary.totalJobs,
        pendingApprovalCount,
        quarantinedItemCount,
        dryRunOnly: true,
      });

      if (this.dueDryRunJobs.length > 0) {
        this.emitEnvelope("scheduler_due_detected", updated, "Due scheduler work was observed; no job was executed.", {
          dueDryRunJobs: this.dueDryRunJobs.length,
          blockedDueJobs: this.dueDryRunJobs.filter((run) => run.blockedBy.length > 0).length,
          dryRunOnly: true,
        });
      }

      if (dueDryRuns.some((run) => run.blockedBy.includes("approval_required"))) {
        this.emitEnvelope("approval_pending", updated, "Scheduled work is waiting for approval before any risky action can proceed.", {
          pendingApprovalCount,
          dryRunOnly: true,
        });
      }

      if (lifecycleState === "quarantined") {
        this.emitEnvelope("quarantined", updated, "Runtime continuity observed quarantined governance items and will not expand autonomy.", {
          quarantinedItemCount,
          dryRunOnly: true,
        });
      } else if (lifecycleState === "degraded") {
        this.emitEnvelope("degraded", updated, "Runtime continuity is degraded until governance review is complete.", {
          degradedReasons,
          dryRunOnly: true,
        });
      }

      this.refreshStatusFromSnapshot(updated, lifecycleState, "tick");
    } catch (error) {
      const reason = error instanceof Error ? sanitizeString(error.message) : "Runtime continuity tick failed.";
      const snapshot = this.deps.continuity.updateSnapshot({ lifecycleState: "degraded", degradedReasons: [reason] });
      this.emitEnvelope("degraded", snapshot, "Runtime continuity tick failed safely and marked the runtime degraded.", {
        reason,
        dryRunOnly: true,
      });
      this.refreshStatusFromSnapshot(snapshot, "degraded", reason);
    } finally {
      this.inFlight = false;
      this.setStatus({ ...this.status, inFlight: false });
    }

    return this.getLoopStatus();
  }

  getLoopStatus(): RuntimeContinuityLoopStatus {
    return {
      ...this.status,
      dueDryRunJobs: this.dueDryRunJobs.length,
      degradedReasons: [...this.status.degradedReasons],
    };
  }

  subscribe(listener: LoopListener): () => void {
    this.listeners.add(listener);
    listener(this.getLoopStatus());
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.stop("dispose");
    this.listeners.clear();
    this.disposed = true;
  }

  private ensureSnapshot(): RuntimeContinuitySnapshot {
    return this.deps.continuity.readSnapshot() ?? this.deps.continuity.createSnapshot({ lifecycleState: "starting" });
  }

  private ensureInterval(): void {
    this.clearInterval();
    if (this.disposed || this.intervalMs <= 0) return;
    this.intervalId = this.deps.setIntervalFn(() => {
      void this.tick();
    }, this.intervalMs);
  }

  private clearInterval(): void {
    if (!this.intervalId) return;
    this.deps.clearIntervalFn(this.intervalId);
    this.intervalId = undefined;
  }

  private pendingApprovalCount(
    schedulerSummary: SchedulerDiagnosticsSummary,
    provenanceSummary: ProvenanceDiagnosticsSummary,
    dueDryRuns: SchedulerDryRunResult[],
  ): number {
    const dueApprovalJobs = dueDryRuns.filter((run) => run.blockedBy.includes("approval_required")).length;
    return schedulerSummary.pendingApprovals + provenanceSummary.pendingApprovals + dueApprovalJobs;
  }

  private quarantinedItemCount(
    schedulerSummary: SchedulerDiagnosticsSummary,
    provenanceSummary: ProvenanceDiagnosticsSummary,
    memorySummary: MemoryGovernanceDiagnosticsSummary,
  ): number {
    return schedulerSummary.quarantinedJobs + provenanceSummary.quarantinedRecords + memorySummary.quarantinedRecords;
  }

  private degradedReasons(
    schedulerSummary: SchedulerDiagnosticsSummary,
    provenanceSummary: ProvenanceDiagnosticsSummary,
    memorySummary: MemoryGovernanceDiagnosticsSummary,
    dueDryRuns: SchedulerDryRunResult[],
  ): string[] {
    const reasons: string[] = [];
    if (dueDryRuns.some((run) => run.blockedBy.includes("approval_required"))) reasons.push("scheduler_approval_required");
    if (schedulerSummary.quarantinedJobs > 0) reasons.push("scheduler_quarantine_review_required");
    if (provenanceSummary.quarantinedRecords > 0) reasons.push("provenance_quarantine_review_required");
    if (memorySummary.quarantinedRecords > 0) reasons.push("memory_quarantine_review_required");
    if (provenanceSummary.revokedRecords > 0) reasons.push("provenance_revocation_review_required");
    return unique(reasons);
  }

  private statusFromSnapshot(
    snapshot: RuntimeContinuitySnapshot | null,
    lifecycleState: RuntimeLifecycleState,
  ): RuntimeContinuityLoopStatus {
    const now = this.deps.now();
    return {
      lifecycleState,
      running: Boolean(this.intervalId) && lifecycleState !== "stopped" && lifecycleState !== "stopping",
      dryRunOnly: true,
      inFlight: this.inFlight,
      intervalMs: this.intervalMs,
      lastTickAt: this.status?.lastTickAt,
      nextTickAt: this.intervalId ? new Date(now.getTime() + this.intervalMs).toISOString() : undefined,
      dueDryRunJobs: this.dueDryRunJobs.length,
      pendingApprovalCount: snapshot?.pendingApprovalCount ?? 0,
      scheduledJobCount: snapshot?.scheduledJobCount ?? 0,
      quarantinedItemCount: snapshot?.quarantinedItemCount ?? 0,
      degradedReasons: snapshot?.degradedReasons ? [...snapshot.degradedReasons] : [],
      runtimeId: snapshot?.runtimeId ?? "not-created",
      sessionId: snapshot?.sessionId ?? "not-created",
      lastHeartbeatAt: snapshot?.lastHeartbeatAt,
      lastResumedAt: snapshot?.lastResumedAt,
      lastReason: snapshot?.restartReason,
    };
  }

  private refreshStatusFromSnapshot(
    snapshot: RuntimeContinuitySnapshot | null,
    lifecycleState: RuntimeLifecycleState,
    reason?: string,
  ): void {
    const status = this.statusFromSnapshot(snapshot, lifecycleState);
    this.setStatus({
      ...status,
      running: Boolean(this.intervalId) && lifecycleState !== "stopped" && lifecycleState !== "stopping",
      lastTickAt: reason === "tick" ? this.deps.now().toISOString() : status.lastTickAt,
      lastReason: reason ?? status.lastReason,
    });
  }

  private setStatus(status: RuntimeContinuityLoopStatus): void {
    this.status = { ...status, degradedReasons: [...status.degradedReasons] };
    for (const listener of this.listeners) listener(this.getLoopStatus());
  }

  private emitEnvelope(
    type: RuntimeContinuityEventType,
    snapshot: RuntimeContinuitySnapshot,
    summary: string,
    metadata: Record<string, unknown> = {},
  ): void {
    const createdAt = this.deps.now().toISOString();
    const severity = type === "quarantined" ? "blocked" : type === "degraded" || type === "approval_pending" ? "warning" : "info";
    const envelope: RuntimeContinuityEventEnvelope = {
      eventId: `runtime-event:${type}:${createdAt}`,
      runtimeId: snapshot.runtimeId,
      sessionId: snapshot.sessionId,
      type,
      createdAt,
      severity,
      source: LOOP_SOURCE,
      summary: sanitizeString(summary),
      metadata: safeMetadata(metadata),
    };

    this.deps.bus.emit?.("runtime-continuity-envelope", envelope);
    this.deps.bus.emitEvent?.({
      type: "runtime-continuity-envelope",
      message: envelope.summary,
      priority: severity === "blocked" ? "HIGH" : severity === "warning" ? "MEDIUM" : "LOW",
      context: {
        timestamp: Date.parse(createdAt),
        envelope,
        runtimeId: envelope.runtimeId,
        sessionId: envelope.sessionId,
        continuityEventType: envelope.type,
      },
    });
  }
}

export const runtimeContinuityLoopService = new RuntimeContinuityLoopService();
