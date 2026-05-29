import { eventBus } from "../eventBus";
import { runtimeInboxService, RuntimeInboxService } from "../runtime/RuntimeInboxService";
import { schedulerRegistryService, SchedulerRegistryService } from "./SchedulerRegistryService";
import type { ReminderDeliveryDiagnosticsSummary, ReminderDeliveryRecord } from "../../types/reminderDelivery";
import type { SchedulerCapability, SchedulerJob } from "../../types/scheduler";

interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void; }
const STORAGE_KEY = "LUCA_REMINDER_DELIVERIES_V1";
const MAX_DELIVERIES = 500;
const RISKY_CAPABILITIES: SchedulerCapability[] = ["tool", "network", "shell", "filesystem", "skill", "memory_write"];
function nowIso(): string { return new Date().toISOString(); }
function storage(): StorageLike | undefined { if (typeof window !== "undefined" && window.localStorage) return window.localStorage; if (typeof localStorage !== "undefined") return localStorage; return undefined; }
function readDeliveries(store: StorageLike | undefined): ReminderDeliveryRecord[] { try { const raw = store?.getItem(STORAGE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function safeCapabilities(capabilities: SchedulerCapability[]): boolean { return capabilities.length > 0 && capabilities.every((capability) => capability === "notify" || capability === "memory_read") && capabilities.includes("notify") && !capabilities.some((capability) => RISKY_CAPABILITIES.includes(capability)); }

export interface ReminderDeliveryCheck { allowed: boolean; reason: string; blockedBy: string[]; }

export class ReminderDeliveryService {
  private deliveries: ReminderDeliveryRecord[];
  constructor(private readonly deps: { storage?: StorageLike; scheduler: Pick<SchedulerRegistryService, "getSafeDueNotifyJobs" | "markJobDelivered">; inbox: Pick<RuntimeInboxService, "ingestEvent">; bus: Pick<typeof eventBus, "emitEvent" | "emit">; now: () => Date } = { storage: storage(), scheduler: schedulerRegistryService, inbox: runtimeInboxService, bus: eventBus, now: () => new Date() }) {
    this.deliveries = readDeliveries(deps.storage);
  }

  canDeliverJob(job: SchedulerJob, at: string = this.deps.now().toISOString()): ReminderDeliveryCheck {
    const blockedBy: string[] = [];
    if (!job.enabled) blockedBy.push("disabled");
    if (!job.nextRunAt || Date.parse(job.nextRunAt) > Date.parse(at)) blockedBy.push("not_due");
    if (!job.provenance?.provenanceId) blockedBy.push("missing_provenance");
    if (job.provenance?.quarantineState === "quarantined" || job.status === "quarantined") blockedBy.push("quarantined");
    if (job.provenance?.revocationState === "revoked") blockedBy.push("revoked_provenance");
    if (!safeCapabilities(job.allowedCapabilities)) blockedBy.push("risky_capability");
    if (!["not_required", "approved_once"].includes(job.requiredApproval)) blockedBy.push("approval_required");
    if (!["in_app", "notification"].includes(job.deliveryTarget)) blockedBy.push("unsafe_delivery_target");
    if (this.findDelivery(job)?.status === "delivered") blockedBy.push("duplicate_due_delivery");
    return { allowed: blockedBy.length === 0, reason: blockedBy.length === 0 ? "Safe local reminder delivery is allowed." : `Reminder delivery blocked: ${blockedBy.join(", ")}.`, blockedBy };
  }

  deliverDueNotifyJob(job: SchedulerJob, at: string = this.deps.now().toISOString()): ReminderDeliveryRecord {
    const check = this.canDeliverJob(job, at);
    const existing = this.findDelivery(job);
    if (existing?.status === "delivered") return existing;
    const timestamp = this.deps.now().toISOString();
    const dueAt = job.nextRunAt ?? at;
    const record: ReminderDeliveryRecord = {
      deliveryId: existing?.deliveryId ?? `reminder:${job.jobId}:${dueAt}`,
      jobId: job.jobId,
      title: job.title,
      message: job.description,
      dueAt,
      deliveredAt: check.allowed ? timestamp : undefined,
      status: check.allowed ? "delivered" : "blocked",
      reason: check.reason,
      provenanceId: job.provenance.provenanceId,
      dryRunOnly: !check.allowed,
      deliveryTarget: job.deliveryTarget === "notification" ? "notification" : "in_app",
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    this.upsert(record);
    if (check.allowed) {
      this.deps.scheduler.markJobDelivered(job.jobId, timestamp);
      this.deps.inbox.ingestEvent({ source: "scheduler", sourceTrustLevel: job.provenance.sourceTrustLevel, title: job.title, body: job.description, eventType: "reminder_delivered", provenance: job.provenance, requiresApproval: false, relatedJobId: job.jobId, metadata: { deliveryId: record.deliveryId, deliveryTarget: record.deliveryTarget } });
      this.deps.bus.emitEvent?.({ type: "reminder-delivered", message: `Reminder delivered: ${job.title}`, priority: "LOW", context: { jobId: job.jobId, deliveryId: record.deliveryId, timestamp: Date.now() } });
      this.deps.bus.emit?.("reminder_delivered", record);
    } else {
      this.deps.bus.emit?.("reminder_blocked", record);
    }
    return record;
  }

  deliverDueNotifyJobs(at: string = this.deps.now().toISOString()): ReminderDeliveryRecord[] {
    return this.deps.scheduler.getSafeDueNotifyJobs(at).map((job) => this.deliverDueNotifyJob(job, at));
  }
  listDeliveries(): ReminderDeliveryRecord[] { return [...this.deliveries]; }
  markDelivered(deliveryId: string, deliveredAt = this.deps.now().toISOString()): ReminderDeliveryRecord | undefined { const record = this.deliveries.find((item) => item.deliveryId === deliveryId); if (!record) return undefined; const next = { ...record, status: "delivered" as const, deliveredAt, updatedAt: deliveredAt, dryRunOnly: false }; this.upsert(next); return next; }
  getDiagnosticsSummary(): ReminderDeliveryDiagnosticsSummary { const delivered = this.deliveries.filter((item) => item.status === "delivered"); return { totalDeliveries: this.deliveries.length, deliveredCount: delivered.length, blockedCount: this.deliveries.filter((item) => item.status === "blocked").length, failedCount: this.deliveries.filter((item) => item.status === "failed").length, pendingCount: this.deliveries.filter((item) => item.status === "pending").length, lastDeliveredAt: delivered[delivered.length - 1]?.deliveredAt, safeLoopDeliveryEnabled: true }; }
  private findDelivery(job: SchedulerJob): ReminderDeliveryRecord | undefined { const dueAt = job.nextRunAt; return this.deliveries.find((item) => item.jobId === job.jobId && item.dueAt === dueAt); }
  private upsert(record: ReminderDeliveryRecord): void { this.deliveries = [record, ...this.deliveries.filter((item) => item.deliveryId !== record.deliveryId)]; if (this.deliveries.length > MAX_DELIVERIES) this.deliveries = this.deliveries.slice(0, MAX_DELIVERIES); this.deps.storage?.setItem(STORAGE_KEY, JSON.stringify(this.deliveries)); }
}
export const reminderDeliveryService = new ReminderDeliveryService();
