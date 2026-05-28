import { describe, expect, it, vi } from "vitest";
import { ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { SchedulerRegistryService } from "./SchedulerRegistryService";
import { ReminderDeliveryService } from "./ReminderDeliveryService";
class MemoryStorage { private values = new Map<string, string>(); getItem(key: string): string | null { return this.values.get(key) ?? null; } setItem(key: string, value: string): void { this.values.set(key, value); } }
function makeService() {
  const storage = new MemoryStorage();
  const provenance = new ProvenanceGateService(storage);
  const scheduler = new SchedulerRegistryService(storage);
  const inbox = { ingestEvent: vi.fn() };
  const bus = { emitEvent: vi.fn(), emit: vi.fn() };
  const reminders = new ReminderDeliveryService({ storage, scheduler, inbox, bus, now: () => new Date("2026-05-28T12:00:00.000Z") });
  return { storage, provenance, scheduler, inbox, bus, reminders };
}

describe("ReminderDeliveryService", () => {
  it("delivers safe notify jobs, updates scheduler state, and creates inbox events", () => {
    const { provenance, scheduler, inbox, reminders } = makeService();
    const prov = provenance.createProvenanceRecord({ sourceType: "scheduled_job", sourceId: "safe", approvalState: "not_required" });
    const job = scheduler.createReminderJob({ title: "Stand up", description: "Take a break", schedule: { kind: "once", runAt: "2026-05-28T11:59:00.000Z" }, provenance: prov });
    const [delivery] = reminders.deliverDueNotifyJobs("2026-05-28T12:00:00.000Z");
    expect(delivery.status).toBe("delivered");
    expect(delivery.dryRunOnly).toBe(false);
    expect(scheduler.listJobs().find((item) => item.jobId === job.jobId)?.lastRunAt).toBe("2026-05-28T12:00:00.000Z");
    expect(inbox.ingestEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "reminder_delivered" }));
  });

  it("blocks risky, quarantined, and revoked jobs", () => {
    const { provenance, scheduler, reminders } = makeService();
    const riskyProv = provenance.createProvenanceRecord({ sourceType: "scheduled_job", sourceId: "risky", approvalState: "not_required" });
    const risky = scheduler.createJob({ title: "Shell", description: "No", schedule: { kind: "once", runAt: "2026-05-28T11:59:00.000Z" }, provenance: riskyProv, allowedCapabilities: ["notify", "shell"], requiredApproval: "approved_once" });
    expect(reminders.deliverDueNotifyJob(risky).status).toBe("blocked");
    expect(reminders.canDeliverJob(risky).blockedBy).toContain("risky_capability");
    const quarantinedProv = provenance.createProvenanceRecord({ sourceType: "scheduled_job", sourceId: "q", approvalState: "not_required" });
    quarantinedProv.quarantineState = "quarantined";
    const quarantined = scheduler.createReminderJob({ title: "Q", description: "Q", schedule: { kind: "once", runAt: "2026-05-28T11:59:00.000Z" }, provenance: quarantinedProv });
    expect(reminders.deliverDueNotifyJob(quarantined).reason).toContain("quarantined");
    const revokedProv = provenance.createProvenanceRecord({ sourceType: "scheduled_job", sourceId: "revoked", approvalState: "not_required" });
    revokedProv.revocationState = "revoked";
    const revoked = scheduler.createReminderJob({ title: "R", description: "R", schedule: { kind: "once", runAt: "2026-05-28T11:59:00.000Z" }, provenance: revokedProv });
    expect(reminders.deliverDueNotifyJob(revoked).reason).toContain("revoked_provenance");
  });

  it("prevents duplicate delivery for the same job due time", () => {
    const { provenance, scheduler, reminders } = makeService();
    const prov = provenance.createProvenanceRecord({ sourceType: "scheduled_job", sourceId: "dup", approvalState: "not_required" });
    const job = scheduler.createReminderJob({ title: "Dup", description: "Once", schedule: { kind: "interval", intervalMs: 60_000 }, nextRunAt: "2026-05-28T11:59:00.000Z", provenance: prov });
    const first = reminders.deliverDueNotifyJob(job);
    const second = reminders.deliverDueNotifyJob(job);
    expect(first.deliveryId).toBe(second.deliveryId);
    expect(reminders.getDiagnosticsSummary().deliveredCount).toBe(1);
  });
});
