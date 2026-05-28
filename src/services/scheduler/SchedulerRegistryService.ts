import type { ProvenanceMetadata } from "../../types/provenance";
import type { SchedulerCapability, SchedulerDiagnosticsSummary, SchedulerDryRunResult, SchedulerJob, SchedulerJobSchedule } from "../../types/scheduler";

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; }
const STORAGE_KEY = "LUCA_SCHEDULER_JOBS_V1";
const RISKY_CAPABILITIES: SchedulerCapability[] = ["tool", "network", "shell", "filesystem", "skill", "memory_write"];
function nowIso(): string { return new Date().toISOString(); }
function storage(): StorageLike | undefined { if (typeof window !== "undefined" && window.localStorage) return window.localStorage; if (typeof localStorage !== "undefined") return localStorage; return undefined; }
function readJobs(store: StorageLike | undefined): SchedulerJob[] { try { const raw = store?.getItem(STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function nextRunFrom(schedule: SchedulerJobSchedule, from = Date.now()): string | undefined { if (schedule.kind === "once") return schedule.runAt; if (schedule.kind === "interval" && schedule.intervalMs) return new Date(from + schedule.intervalMs).toISOString(); return undefined; }

export class SchedulerRegistryService {
  private jobs: SchedulerJob[];
  constructor(private readonly backingStorage: StorageLike | undefined = storage()) { this.jobs = readJobs(this.backingStorage); }

  createJob(input: Omit<Partial<SchedulerJob>, "provenance" | "dryRunOnly"> & { title: string; description: string; schedule: SchedulerJobSchedule; provenance: ProvenanceMetadata; allowedCapabilities?: SchedulerCapability[] }): SchedulerJob {
    const timestamp = nowIso();
    const allowedCapabilities = input.allowedCapabilities ?? ["notify"];
    const risky = this.isRisky(allowedCapabilities);
    const job: SchedulerJob = {
      jobId: input.jobId ?? `job:${timestamp}`,
      title: input.title,
      description: input.description,
      schedule: input.schedule,
      enabled: input.enabled ?? true,
      createdAt: input.createdAt ?? timestamp,
      updatedAt: timestamp,
      lastRunAt: input.lastRunAt,
      nextRunAt: input.nextRunAt ?? nextRunFrom(input.schedule, Date.parse(timestamp)),
      provenance: input.provenance,
      requiredApproval: input.requiredApproval ?? (risky ? "required" : "not_required"),
      allowedCapabilities,
      deliveryTarget: input.deliveryTarget ?? "in_app",
      dryRunOnly: true,
      status: input.status ?? "idle",
    };
    this.jobs = [...this.jobs.filter((item) => item.jobId !== job.jobId), job];
    this.persist();
    return job;
  }

  listJobs(): SchedulerJob[] { return [...this.jobs]; }
  updateJob(jobId: string, update: Partial<SchedulerJob>): SchedulerJob | undefined { const existing = this.jobs.find((job) => job.jobId === jobId); if (!existing) return undefined; const job = { ...existing, ...update, jobId: existing.jobId, createdAt: existing.createdAt, dryRunOnly: true as const, updatedAt: nowIso() }; this.jobs = this.jobs.map((item) => item.jobId === jobId ? job : item); this.persist(); return job; }
  disableJob(jobId: string): SchedulerJob | undefined { return this.updateJob(jobId, { enabled: false, status: "disabled" }); }
  deleteJob(jobId: string): void { this.jobs = this.jobs.filter((job) => job.jobId !== jobId); this.persist(); }

  detectDueJobsDryRun(at: string = nowIso()): SchedulerDryRunResult[] {
    return this.jobs.map((job) => this.dryRunJob(job, at)).filter((result) => result.due || result.blockedBy.length > 0);
  }

  dryRunJob(job: SchedulerJob, at: string = nowIso()): SchedulerDryRunResult {
    const blockedBy: string[] = [];
    const risky = this.isRisky(job.allowedCapabilities);
    const due = Boolean(job.nextRunAt && Date.parse(job.nextRunAt) <= Date.parse(at));
    if (!job.enabled) blockedBy.push("disabled");
    if (job.provenance.quarantineState === "quarantined" || job.status === "quarantined") blockedBy.push("quarantined");
    if (job.provenance.revocationState === "revoked") blockedBy.push("revoked_provenance");
    if (risky && !["approved_once", "not_required"].includes(job.requiredApproval)) blockedBy.push("approval_required");
    return { jobId: job.jobId, title: job.title, due, wouldRun: due && blockedBy.length === 0, dryRunOnly: true, requiredApproval: job.requiredApproval, userSafeReason: blockedBy.length > 0 ? "Scheduled work is dry-run only and blocked until approvals/provenance are safe." : "Scheduled work is due, but this PR only reports a dry run.", blockedBy };
  }

  getDiagnosticsSummary(at: string = nowIso()): SchedulerDiagnosticsSummary {
    const dryRuns = this.jobs.map((job) => this.dryRunJob(job, at));
    return { totalJobs: this.jobs.length, enabledJobs: this.jobs.filter((job) => job.enabled).length, disabledJobs: this.jobs.filter((job) => !job.enabled).length, dueJobs: dryRuns.filter((run) => run.due).length, pendingApprovals: this.jobs.filter((job) => ["required", "pending"].includes(job.requiredApproval)).length, quarantinedJobs: this.jobs.filter((job) => job.status === "quarantined" || job.provenance.quarantineState === "quarantined").length, riskyJobs: this.jobs.filter((job) => this.isRisky(job.allowedCapabilities)).length, dryRunOnly: true };
  }

  private isRisky(capabilities: SchedulerCapability[]): boolean { return capabilities.some((capability) => RISKY_CAPABILITIES.includes(capability)); }
  private persist(): void { this.backingStorage?.setItem(STORAGE_KEY, JSON.stringify(this.jobs)); }
}

export const schedulerRegistryService = new SchedulerRegistryService();
