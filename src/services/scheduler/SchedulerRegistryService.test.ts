import { describe, expect, it } from "vitest";
import { ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { SchedulerRegistryService } from "./SchedulerRegistryService";
class MemoryStorage { private values = new Map<string, string>(); getItem(key: string): string | null { return this.values.get(key) ?? null; } setItem(key: string, value: string): void { this.values.set(key, value); } }

describe("SchedulerRegistryService", () => {
  it("creates, lists, disables, and deletes jobs", () => {
    const storage = new MemoryStorage();
    const prov = new ProvenanceGateService(storage).createProvenanceRecord({ sourceType: "scheduled_job", sourceId: "job" });
    const scheduler = new SchedulerRegistryService(storage);
    const job = scheduler.createJob({ title: "Check", description: "Dry run", schedule: { kind: "once", runAt: "2026-05-28T00:00:00.000Z" }, provenance: prov });
    expect(scheduler.listJobs()).toHaveLength(1);
    expect(scheduler.disableJob(job.jobId)?.enabled).toBe(false);
    scheduler.deleteJob(job.jobId);
    expect(scheduler.listJobs()).toHaveLength(0);
  });

  it("detects due jobs dry-run only and requires approval for risky jobs", () => {
    const storage = new MemoryStorage();
    const prov = new ProvenanceGateService(storage).createProvenanceRecord({ sourceType: "scheduled_job", sourceId: "job" });
    const scheduler = new SchedulerRegistryService(storage);
    scheduler.createJob({ title: "Shell", description: "Should not run", schedule: { kind: "once", runAt: "2026-05-28T00:00:00.000Z" }, provenance: prov, allowedCapabilities: ["shell"] });
    const [dryRun] = scheduler.detectDueJobsDryRun("2026-05-28T00:01:00.000Z");
    expect(dryRun.dryRunOnly).toBe(true);
    expect(dryRun.wouldRun).toBe(false);
    expect(dryRun.wouldRunIfExecutionEnabled).toBe(false);
    expect(dryRun.userSafeReason).toContain("no job executed");
    expect(dryRun.blockedBy).toContain("approval_required");
  });

  it("creates safe reminder jobs and advances delivered reminders without enabling risky execution", () => {
    const storage = new MemoryStorage();
    const prov = new ProvenanceGateService(storage).createProvenanceRecord({ sourceType: "scheduled_job", sourceId: "reminder", approvalState: "not_required" });
    const scheduler = new SchedulerRegistryService(storage);
    const job = scheduler.createReminderJob({ title: "Reminder", description: "Safe", schedule: { kind: "interval", intervalMs: 60_000 }, nextRunAt: "2026-05-28T00:00:00.000Z", provenance: prov });
    expect(job.allowedCapabilities).toEqual(["notify"]);
    expect(scheduler.getSafeDueNotifyJobs("2026-05-28T00:01:00.000Z")).toHaveLength(1);
    scheduler.markJobDelivered(job.jobId, "2026-05-28T00:01:00.000Z");
    const updated = scheduler.listJobs()[0];
    expect(updated.lastRunAt).toBe("2026-05-28T00:01:00.000Z");
    expect(updated.nextRunAt).toBe("2026-05-28T00:02:00.000Z");
    scheduler.createJob({ title: "Shell", description: "Risky", schedule: { kind: "once", runAt: "2026-05-28T00:00:00.000Z" }, provenance: prov, allowedCapabilities: ["shell"] });
    expect(scheduler.detectDueJobsDryRun("2026-05-28T00:01:00.000Z").some((run) => run.dryRunOnly)).toBe(true);
  });

  it("blocks disabled and quarantined jobs", () => {
    const storage = new MemoryStorage();
    const prov = new ProvenanceGateService(storage).createProvenanceRecord({ sourceType: "scheduled_job", sourceId: "job" });
    prov.quarantineState = "quarantined";
    const scheduler = new SchedulerRegistryService(storage);
    const job = scheduler.createJob({ title: "Q", description: "Quarantined", schedule: { kind: "once", runAt: "2026-05-28T00:00:00.000Z" }, provenance: prov });
    expect(scheduler.dryRunJob(job, "2026-05-28T00:01:00.000Z").blockedBy).toContain("quarantined");
    scheduler.disableJob(job.jobId);
    expect(scheduler.detectDueJobsDryRun("2026-05-28T00:01:00.000Z")[0].blockedBy).toContain("disabled");
  });
});
