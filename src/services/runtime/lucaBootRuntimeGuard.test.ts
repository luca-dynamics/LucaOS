import { describe, expect, it } from "vitest";
import {
  bootPhaseNeedsDegradedRecovery,
  createBootPhaseRecord,
  getBootRuntimeGuardExecutionSurfaces,
  resolveBootDestination,
  runBootPhase,
  runNonBlockingBootPhase,
  withBootTimeout,
} from "./lucaBootRuntimeGuard";

const never = <T = never>() => new Promise<T>(() => undefined);

describe("lucaBootRuntimeGuard", () => {
  it("resolves a successful phase as passed", async () => {
    const record = await runBootPhase({
      phaseId: "server-health",
      label: "Server health",
      timeoutMs: 50,
      run: async () => true,
    });

    expect(record.status).toBe("passed");
    expect(record.value).toBe(true);
    expect(record.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("resolves a failed phase as failed", async () => {
    const record = await runBootPhase({
      phaseId: "cortex-core",
      label: "Cortex core",
      timeoutMs: 50,
      run: async () => {
        throw new Error("cortex offline");
      },
    });

    expect(record.status).toBe("failed");
    expect(record.errorSummary).toContain("cortex offline");
  });

  it("resolves a hanging phase as timed-out", async () => {
    const record = await runBootPhase({
      phaseId: "memory-banks",
      label: "Memory banks",
      timeoutMs: 5,
      run: () => never(),
    });

    expect(record.status).toBe("timed-out");
    expect(record.errorSummary).toContain("timed out");
  });

  it("does not throw for a non-blocking timeout", async () => {
    await expect(
      runNonBlockingBootPhase({
        phaseId: "self-expression",
        label: "Self-expression announcement",
        timeoutMs: 5,
        run: () => never(),
      }),
    ).resolves.toMatchObject({
      phaseId: "self-expression",
      status: "degraded",
      blocking: false,
    });
  });

  it("records and returns a blocking timeout safely", async () => {
    const record = await runBootPhase({
      phaseId: "kernel-watchdog",
      label: "Kernel watchdog",
      blocking: true,
      timeoutMs: 5,
      run: () => never(),
    });

    expect(record).toMatchObject({
      phaseId: "kernel-watchdog",
      status: "timed-out",
      blocking: true,
    });
  });

  it("resolves boot destination to READY or ONBOARDING based on setupComplete", () => {
    expect(resolveBootDestination({ setupComplete: true })).toBe("READY");
    expect(resolveBootDestination({ setupComplete: false })).toBe("ONBOARDING");
  });

  it("allows degraded boot records to proceed", () => {
    const degraded = createBootPhaseRecord({
      phaseId: "vision-readiness",
      label: "Vision readiness",
      blocking: false,
      timeoutMs: 2_000,
      status: "degraded",
      degradedReason: "Camera unavailable",
    });

    expect(bootPhaseNeedsDegradedRecovery(degraded)).toBe(true);
    expect(
      resolveBootDestination({ setupComplete: true, degraded: true }),
    ).toBe("READY");
  });

  it("exposes no tool, browser, file, message, or wireless execution surfaces", () => {
    expect(getBootRuntimeGuardExecutionSurfaces()).toEqual({
      toolExecution: false,
      browserAutomation: false,
      fileAccess: false,
      messagingExecution: false,
      wirelessControl: false,
    });
  });

  it("withBootTimeout resolves even when the wrapped promise never settles", async () => {
    await expect(
      withBootTimeout(() => never(), 5, "never phase"),
    ).resolves.toMatchObject({
      status: "timed-out",
    });
  });
});
