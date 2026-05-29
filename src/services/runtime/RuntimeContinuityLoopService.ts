import { eventBus } from "../eventBus";
import { memoryGovernanceService } from "../memory/MemoryGovernanceService";
import { provenanceGateService } from "../provenance/ProvenanceGateService";
import { schedulerRegistryService } from "../scheduler/SchedulerRegistryService";
import { reminderDeliveryService } from "../scheduler/ReminderDeliveryService";
import { approvalRequestCenterService } from "../provenance/ApprovalRequestCenterService";
import { runtimeInboxService } from "./RuntimeInboxService";
import { agentSessionContinuityService } from "./AgentSessionContinuityService";
import type { SchedulerDiagnosticsSummary, SchedulerDryRunResult, SchedulerJob } from "../../types/scheduler";
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
    "detectDueJobsDryRun" | "getDiagnosticsSummary" | "listJobs"
  >;
  reminders: Pick<typeof reminderDeliveryService, "deliverDueNotifyJobs" | "getDiagnosticsSummary">;
  approvals: Pick<typeof approvalRequestCenterService, "getDiagnosticsSummary" | "createApprovalRequest" | "listRequests">;
  inbox: Pick<typeof runtimeInboxService, "getDiagnosticsSummary">;
  sessions: Pick<typeof agentSessionContinuityService, "getDiagnosticsSummary">;
  provenance: Pick<typeof provenanceGateService, "getDiagnosticsSummary">;
  memoryGovernance: Pick<typeof memoryGovernanceService, "getDiagnosticsSummary">;
  bus: Pick<typeof eventBus, "emitEvent" | "emit">;
  setIntervalFn: typeof setInterval;
  clearIntervalFn: typeof clearInterval;
  now: () => Date;
}

const DEFAULT_INTERVAL_MS = 60_000;
const LOOP_SOURCE = "runtime-continuity-loop";
const LOG_PREFIX = "[RuntimeContinuityLoop]";
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
  private deliveredReminderCount = 0;

  constructor(private readonly deps: RuntimeContinuityLoopDependencies = {
    continuity: runtimeContinuityService,
    scheduler: schedulerRegistryService,
    reminders: reminderDeliveryService,
    approvals: approvalRequestCenterService,
    inbox: runtimeInboxService,
    sessions: agentSessionContinuityService,
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
    if (this.disposed) throw new Error("Cannot start a disposed RuntimeContinuityLoopService. Create a new instance.");
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
    if (this.disposed) throw new Error("Cannot resume a disposed RuntimeContinuityLoopService. Create a new instance.");
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
    if (this.disposed) return this.getLoopStatus();
    if (this.inFlight) {
      console.warn(`${LOG_PREFIX} Tick skipped — previous tick still in flight at ${this.deps.now().toISOString()}`);
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
      const reminderDeliveries = this.deps.reminders.deliverDueNotifyJobs(tickAt);
      const createdApprovalRequests = this.createApprovalRequestsForRiskyDueJobs(dueDryRuns, tickAt);
      this.deliveredReminderCount += reminderDeliveries.filter((delivery) => delivery.status === "delivered").length;
      const reminderSummary = this.deps.reminders.getDiagnosticsSummary();
      const schedulerSummary = this.deps.scheduler.getDiagnosticsSummary(tickAt);
      const provenanceSummary = this.deps.provenance.getDiagnosticsSummary();
      const approvalSummary = this.deps.approvals.getDiagnosticsSummary();
      const inboxSummary = this.deps.inbox.getDiagnosticsSummary();
      const sessionSummary = this.deps.sessions.getDiagnosticsSummary();
      const memorySummary = this.deps.memoryGovernance.getDiagnosticsSummary();
      const pendingApprovalCount = this.pendingApprovalCount(schedulerSummary, provenanceSummary, dueDryRuns) + approvalSummary.pendingRequests;
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
        deliveredReminderCount: reminderSummary.deliveredCount,
        quarantinedItemCount,
        degradedReasons,
        lastHeartbeatAt: heartbeat.lastHeartbeatAt,
      });

      this.emitEnvelope("dry_run_tick", updated, "Scheduler dry-run tick completed without executing jobs.", {
        dueDryRunJobs: this.dueDryRunJobs.length,
        schedulerJobCount: schedulerSummary.totalJobs,
        pendingApprovalCount,
        quarantinedItemCount,
        deliveredReminderCount: reminderSummary.deliveredCount,
        createdApprovalRequests,
        dryRunOnly: true,
      });



      for (const delivery of reminderDeliveries) {
        this.emitEnvelope(
          delivery.status === "delivered" ? "reminder_delivered" : "reminder_blocked",
          updated,
          delivery.status === "delivered" ? "Safe local reminder delivered." : "Reminder delivery was blocked by governance.",
          {
            jobId: delivery.jobId,
            deliveryId: delivery.deliveryId,
            status: delivery.status,
            reason: delivery.reason,
            dryRunOnly: delivery.dryRunOnly,
          },
        );
      }



      if (inboxSummary.unreadEvents > 0) {
        this.emitEnvelope("inbox_event_ingested", updated, "Continuity inbox has unread inert event records.", {
          unreadEvents: inboxSummary.unreadEvents,
          dryRunOnly: true,
        });
      }

      if (sessionSummary.safeToResumeSessions > 0) {
        this.emitEnvelope("session_resume_available", updated, "A safe resumable agent session is available.", {
          safeToResumeSessions: sessionSummary.safeToResumeSessions,
          dryRunOnly: true,
        });
      }

      if (createdApprovalRequests > 0) {
        this.emitEnvelope("approval_request_created", updated, "Risky due scheduler work was converted into approval request records only.", {
          createdApprovalRequests,
          dryRunOnly: true,
        });
      }

      if (this.dueDryRunJobs.length > 0) {
        this.emitEnvelope("scheduler_due_detected", updated, "Due scheduler work was observed; no job was executed.", {
          dueDryRunJobs: this.dueDryRunJobs.length,
          blockedDueJobs: this.dueDryRunJobs.filter((run) => run.blockedBy.length > 0).length,
          dryRunOnly: true,
        });
      }

      if (dueDryRuns.some((run) => run.blockedBy.includes("approval_required")) || approvalSummary.pendingRequests > 0) {
        this.emitEnvelope("approval_pending", updated, "Scheduled work is waiting for approval before any risky action can proceed.", {
          pendingApprovalCount,
          approvalRequestCount: approvalSummary.pendingRequests,
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
      deliveredReminderCount: this.deliveredReminderCount,
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


  private createApprovalRequestsForRiskyDueJobs(dueDryRuns: SchedulerDryRunResult[], tickAt: string): number {
    const jobsById = new Map(this.deps.scheduler.listJobs().map((job: SchedulerJob) => [job.jobId, job]));
    let created = 0;
    for (const run of dueDryRuns) {
      if (!run.due || !run.blockedBy.includes("approval_required")) continue;
      const job = jobsById.get(run.jobId);
      if (!job?.provenance?.provenanceId) continue;
      const occurrenceAt = job.nextRunAt ?? job.schedule.runAt ?? tickAt;
      const existingIds = new Set(this.deps.approvals.listRequests().map((r) => r.approvalRequestId));
      const result = this.deps.approvals.createApprovalRequest(
        {
          actionInstanceId: `scheduler:${job.jobId}:${occurrenceAt}`,
          actionType: "scheduled_job",
          target: job.jobId,
          parameters: { allowedCapabilities: job.allowedCapabilities, deliveryTarget: job.deliveryTarget },
          provenanceChain: [job.provenance.provenanceId],
          timestampBucket: job.nextRunAt ?? undefined,
        },
        {
          title: `Approval required: ${job.title}`,
          description: "Risky scheduled work is request-only; no tool, shell, filesystem, network, or skill action was executed.",
          riskLevel: "high",
          requestedBy: LOOP_SOURCE,
          sourceType: "scheduler",
          sourceId: job.jobId,
          actionPreview: { title: job.title, allowedCapabilities: job.allowedCapabilities, deliveryTarget: job.deliveryTarget },
        },
      );
      if (!existingIds.has(result.approvalRequestId)) {
        console.info(`${LOG_PREFIX} Created approval request for job=${job.jobId} requestId=${result.approvalRequestId}`);
        created += 1;
      } else {
        console.info(`${LOG_PREFIX} Deduplicated approval request for job=${job.jobId} existingId=${result.approvalRequestId}`);
      }
    }
    return created;
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
      deliveredReminderCount: snapshot?.deliveredReminderCount ?? this.deliveredReminderCount,
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
