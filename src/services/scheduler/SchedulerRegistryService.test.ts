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
    expect(dryRun.blockedBy).toContain("approval_required");
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
