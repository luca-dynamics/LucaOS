import { describe, expect, it } from "vitest";
import {
  buildExecutionPlanFromMissionTape,
  finalizeMissionTapeWithVerification,
} from "./missionTapeCompletionGate";
import { MissionTapeRecorderService } from "./MissionTapeRecorder";
import {
  createExecutionPlan,
  createExecutionStep,
} from "../execution/LucaDeterministicExecution";

describe("missionTapeCompletionGate (absorb phase 1 pilot)", () => {
  it("builds a plan from tape steps", async () => {
    const recorder = new MissionTapeRecorderService();
    await recorder.createTape("m1", "organize files");
    await recorder.appendStep("m1", {
      stepId: "s1",
      goal: "write report file",
      status: "executed",
    });
    const tape = await recorder.getTape("m1");
    const plan = buildExecutionPlanFromMissionTape(tape!);
    expect(plan.steps.length).toBe(1);
    expect(plan.steps[0].kind).toBe("filesystem");
  });

  it("blocks completed status when high-risk gates fail", async () => {
    const recorder = new MissionTapeRecorderService();
    await recorder.createTape("m-high", "delete system files");

    const plan = createExecutionPlan({
      summary: "destructive cleanup",
      actorTier: "normal",
      steps: [
        createExecutionStep({
          summary: "wipe directory",
          kind: "filesystem",
          riskLevel: "high",
          requiresRollback: true,
          rollbackAvailable: false,
          receiptRequired: true,
          receiptAvailable: false,
        }),
      ],
    });

    const result = await finalizeMissionTapeWithVerification(recorder, {
      missionId: "m-high",
      desiredStatus: "completed",
      plan,
      verificationContext: {
        intentClear: true,
        permissionGranted: true,
        capabilityAvailable: true,
        // leave rollback/receipt false so high-risk gates block
        rollbackAvailable: false,
        receiptAvailable: false,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.completed).toBe(false);
    expect(result.blockedByVerification).toBe(true);
    expect(result.tape.status).not.toBe("completed");
    expect(
      result.tape.verification.some((v) => v.stepId === "mission-completion-gate"),
    ).toBe(true);
  });

  it("allows completed when gates pass", async () => {
    const recorder = new MissionTapeRecorderService();
    await recorder.createTape("m-ok", "summarize notes");

    const plan = createExecutionPlan({
      summary: "low risk memory write",
      actorTier: "normal",
      steps: [
        createExecutionStep({
          summary: "store note",
          kind: "memory",
          riskLevel: "low",
        }),
      ],
    });

    const result = await finalizeMissionTapeWithVerification(recorder, {
      missionId: "m-ok",
      desiredStatus: "completed",
      plan,
      verificationContext: {
        intentClear: true,
        permissionGranted: true,
        capabilityAvailable: true,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.completed).toBe(true);
    expect(result.tape.status).toBe("completed");
    expect(result.gateSnapshot.summary.ok).toBe(true);
  });

  it("allows override to complete despite failed gates", async () => {
    const recorder = new MissionTapeRecorderService();
    await recorder.createTape("m-ov", "risky force complete");

    const plan = createExecutionPlan({
      summary: "high risk without receipt",
      actorTier: "origin",
      steps: [
        createExecutionStep({
          summary: "network post",
          kind: "network",
          riskLevel: "high",
          requiresRollback: true,
          rollbackAvailable: false,
          receiptRequired: true,
          receiptAvailable: false,
        }),
      ],
    });

    const result = await finalizeMissionTapeWithVerification(recorder, {
      missionId: "m-ov",
      desiredStatus: "completed",
      plan,
      verificationOverride: true,
      overrideReason: "Origin approved incomplete evidence path.",
      verificationContext: {
        intentClear: true,
        permissionGranted: true,
        originReviewProvided: true,
        capabilityAvailable: true,
        rollbackAvailable: false,
        receiptAvailable: false,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.completed).toBe(true);
    expect(result.tape.status).toBe("completed");
    expect(
      result.tape.verification.some(
        (v) => v.stepId === "mission-completion-override",
      ),
    ).toBe(true);
  });

  it("always allows non-completed finalize (failed)", async () => {
    const recorder = new MissionTapeRecorderService();
    await recorder.createTape("m-fail", "whatever");
    const result = await finalizeMissionTapeWithVerification(recorder, {
      missionId: "m-fail",
      desiredStatus: "failed",
    });
    expect(result.ok).toBe(true);
    expect(result.completed).toBe(false);
    expect(result.tape.status).toBe("failed");
  });
});
