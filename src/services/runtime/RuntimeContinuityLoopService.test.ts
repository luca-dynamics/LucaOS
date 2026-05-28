import { describe, expect, it, vi } from "vitest";
import { ProvenanceGateService } from "../provenance/ProvenanceGateService";
import { SchedulerRegistryService } from "../scheduler/SchedulerRegistryService";
import { RuntimeContinuityService } from "./RuntimeContinuityService";
import { RuntimeContinuityLoopService } from "./RuntimeContinuityLoopService";
import { buildGovernanceDiagnosticsForAudience } from "./RuntimeDiagnosticsService";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  const storage = new MemoryStorage();
  const continuity = new RuntimeContinuityService(storage);
  const provenance = new ProvenanceGateService(storage);
  const scheduler = new SchedulerRegistryService(storage);
  const bus = { emitEvent: vi.fn(), emit: vi.fn() };
  const intervalHandles: Array<() => void> = [];
  const deps: any = {
    continuity,
    scheduler,
    provenance,
    memoryGovernance: {
      getDiagnosticsSummary: vi.fn(() => ({
        totalRecords: 0,
        visibleRecords: 0,
        quarantinedRecords: 0,
        pendingReviewRecords: 0,
        approvalRequiredWrites: 0,
        rejectedRecords: 0,
      })),
    },
    bus,
    setIntervalFn: vi.fn((callback: () => void) => {
      intervalHandles.push(callback);
      return intervalHandles.length as unknown as ReturnType<typeof setInterval>;
    }),
    clearIntervalFn: vi.fn(),
    now: vi.fn(() => new Date("2026-05-28T12:00:00.000Z")),
    ...overrides,
  };
  return { deps, continuity, scheduler, provenance, bus, intervalHandles };
}

describe("RuntimeContinuityLoopService", () => {
  it("starts safely and records a heartbeat without running an execution tick", () => {
    const { deps, continuity } = makeDeps();
    const loop = new RuntimeContinuityLoopService(deps);

    const status = loop.start({ intervalMs: 1_000, reason: "test_start" });

    expect(status.running).toBe(true);
    expect(status.dryRunOnly).toBe(true);
    expect(continuity.readSnapshot()?.lastHeartbeatAt).toBe("2026-05-28T12:00:00.000Z");
    expect(deps.setIntervalFn).toHaveBeenCalledTimes(1);
  });

  it("ticks scheduler dry-run detection only and emits due job summaries", async () => {
    const { deps, scheduler, provenance, bus } = makeDeps();
    const prov = provenance.createProvenanceRecord({ sourceType: "scheduled_job", sourceId: "job" });
    scheduler.createJob({
      title: "Shell dry run",
      description: "Must never execute",
      schedule: { kind: "once", runAt: "2026-05-28T11:59:00.000Z" },
      provenance: prov,
      allowedCapabilities: ["shell"],
    });
    const detectSpy = vi.spyOn(scheduler, "detectDueJobsDryRun");
    const loop = new RuntimeContinuityLoopService(deps);

    const status = await loop.tick();

    expect(detectSpy).toHaveBeenCalledTimes(1);
    expect(status.dueDryRunJobs).toBe(1);
    expect(status.pendingApprovalCount).toBeGreaterThan(0);
    expect(bus.emitEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "runtime-continuity-envelope",
      message: expect.stringContaining("Due scheduler work was observed"),
    }));
  });

  it("prevents overlapping ticks with an in-flight guard", async () => {
    const { deps } = makeDeps();
    let loop: RuntimeContinuityLoopService;
    const detectDueJobsDryRun = vi.fn(() => {
      void loop.tick();
      return [];
    });
    loop = new RuntimeContinuityLoopService({
      ...deps,
      scheduler: {
        detectDueJobsDryRun,
        getDiagnosticsSummary: deps.scheduler.getDiagnosticsSummary.bind(deps.scheduler),
      },
    });

    await loop.tick();

    expect(detectDueJobsDryRun).toHaveBeenCalledTimes(1);
  });

  it("marks quarantined governance items as quarantined without deleting or executing anything", async () => {
    const executeDueJobs = vi.fn();
    const { deps, scheduler, provenance } = makeDeps({
      memoryGovernance: {
        getDiagnosticsSummary: vi.fn(() => ({
          totalRecords: 1,
          visibleRecords: 1,
          quarantinedRecords: 1,
          pendingReviewRecords: 1,
          approvalRequiredWrites: 0,
          rejectedRecords: 0,
        })),
      },
    });
    const prov = provenance.createProvenanceRecord({ sourceType: "scheduled_job", sourceId: "q" });
    prov.quarantineState = "quarantined";
    scheduler.createJob({ title: "Q", description: "quarantine", schedule: { kind: "once", runAt: "2026-05-28T11:59:00.000Z" }, provenance: prov });
    const loop = new RuntimeContinuityLoopService({ ...deps, scheduler: Object.assign(scheduler, { executeDueJobs }) });

    const status = await loop.tick();

    expect(status.lifecycleState).toBe("quarantined");
    expect(status.quarantinedItemCount).toBeGreaterThan(0);
    expect(executeDueJobs).not.toHaveBeenCalled();
  });

  it("stop and dispose clear scheduled intervals", () => {
    const { deps } = makeDeps();
    const loop = new RuntimeContinuityLoopService(deps);

    loop.start({ intervalMs: 1_000 });
    loop.stop("test_stop");
    loop.start({ intervalMs: 1_000 });
    loop.dispose();

    expect(deps.clearIntervalFn).toHaveBeenCalledTimes(2);
    expect(loop.getLoopStatus().running).toBe(false);
  });

  it("governance diagnostics can carry live loop status", () => {
    const diagnostics = buildGovernanceDiagnosticsForAudience({
      audience: "origin",
      runtimeContinuity: {
        runtimeId: "r",
        sessionId: "s",
        lifecycleState: "idle",
        canSafelyResume: true,
        userSafeStatus: "safe",
        pendingApprovalCount: 0,
        scheduledJobCount: 0,
        quarantinedItemCount: 0,
        degradedReasons: [],
        activeMode: "local",
        loopStatus: {
          lifecycleState: "idle",
          running: true,
          dryRunOnly: true,
          inFlight: false,
          intervalMs: 60_000,
          dueDryRunJobs: 0,
          pendingApprovalCount: 0,
          scheduledJobCount: 0,
          quarantinedItemCount: 0,
          degradedReasons: [],
          runtimeId: "r",
          sessionId: "s",
        },
      },
      scheduler: { totalJobs: 0, enabledJobs: 0, disabledJobs: 0, dueJobs: 0, pendingApprovals: 0, quarantinedJobs: 0, riskyJobs: 0, dryRunOnly: true },
      provenance: { totalRecords: 0, pendingApprovals: 0, approvedOnce: 0, quarantinedRecords: 0, revokedRecords: 0, expiredRecords: 0 },
      skills: { totalSkills: 0, enabledSkills: 0, disabledSkills: 0, quarantinedSkills: 0, skillsMissingProvenance: 0, highRiskSkills: 0 },
      memoryGovernance: { totalRecords: 0, visibleRecords: 0, quarantinedRecords: 0, pendingReviewRecords: 0, approvalRequiredWrites: 0, rejectedRecords: 0 },
    });

    expect(diagnostics.runtimeContinuity.loopStatus?.running).toBe(true);
    expect(diagnostics.runtimeContinuity.loopStatus?.dryRunOnly).toBe(true);
  });
});
