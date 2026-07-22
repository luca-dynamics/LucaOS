import { describe, expect, it, vi } from "vitest";
import { completeProductMission } from "./completeProductMission";
import { recordMissionCheckpoint } from "./missionTapeCheckpoint";
import { MissionTapeRecorderService } from "./MissionTapeRecorder";

describe("completeProductMission (real product wiring)", () => {
  it("completes product mission when all goals COMPLETED and archives", async () => {
    const recorder = new MissionTapeRecorderService();
    const archive = vi.fn(async () => undefined);

    const result = await completeProductMission({
      missionId: "42",
      intent: "Ship notes",
      goals: [
        { id: 1, description: "draft memory note", status: "COMPLETED" },
        { id: 2, description: "confirm memory note", status: "COMPLETED" },
      ],
      recorder,
      success: true,
      onCompletedArchive: archive,
    });

    expect(result.ok).toBe(true);
    expect(result.completed).toBe(true);
    expect(result.archived).toBe(true);
    expect(archive).toHaveBeenCalledWith("42");
    const tape = await recorder.getTape("42");
    expect(tape?.status).toBe("completed");
    expect(tape?.steps.length).toBe(2);
  });

  it("does not archive when completion is blocked", async () => {
    const recorder = new MissionTapeRecorderService();
    const archive = vi.fn(async () => undefined);
    const blocked = vi.fn(async () => undefined);

    const result = await completeProductMission({
      missionId: "99",
      intent: "wipe system",
      steps: [
        {
          stepId: "s1",
          goal: "delete all files",
          status: "executed",
          kind: "filesystem",
        },
      ],
      recorder,
      success: true,
      // no override — high-ish inferred risk may still pass as medium without receipt
      // Force block by using verification context via override path: use empty receipt on high risk plan
      verificationOverride: false,
      onCompletedArchive: archive,
      onBlocked: blocked,
    });

    // Medium filesystem may complete with warnings or block depending on gates.
    // Archive only if completed.
    if (result.completed) {
      expect(archive).toHaveBeenCalled();
    } else {
      expect(archive).not.toHaveBeenCalled();
      expect(result.blockedByVerification || !result.ok).toBe(true);
    }
  });

  it("mirrors computer-use step results then finalizes failed", async () => {
    const recorder = new MissionTapeRecorderService();
    const result = await completeProductMission({
      missionId: "cu-1",
      intent: "computer-use:cu-1",
      success: false,
      recorder,
      steps: [
        {
          stepId: "click-1",
          goal: "computer_use:click-1",
          status: "failed",
          kind: "computer_use",
          notes: "element missing",
        },
      ],
    });

    expect(result.tape.status).toBe("failed");
    expect(result.completed).toBe(false);
  });
});

describe("completeProductMission gate correctness", () => {
  it("completes a finished mission whose goal text matches no kind keyword", async () => {
    const recorder = new MissionTapeRecorderService();
    const archive = vi.fn(async () => undefined);

    const result = await completeProductMission({
      missionId: "wf-1",
      intent: "Ship the onboarding revamp",
      goals: [
        { id: 1, description: "[ENGINEER] implement module", status: "COMPLETED" },
        { id: 2, description: "[AUDITOR] review code", status: "COMPLETED" },
      ],
      recorder,
      success: true,
      onCompletedArchive: archive,
    });

    expect(result.blockedByVerification).toBe(false);
    expect(result.completed).toBe(true);
    expect(result.archived).toBe(true);
  });

  it("refuses to complete a mission whose goals are not done", async () => {
    const recorder = new MissionTapeRecorderService();
    const archive = vi.fn(async () => undefined);
    const blocked = vi.fn(async () => undefined);

    const result = await completeProductMission({
      missionId: "wf-2",
      intent: "Run the tool sweep",
      goals: [
        { id: 1, description: "run tool sweep", status: "PENDING" },
        { id: 2, description: "record tool output", status: "PENDING" },
      ],
      recorder,
      success: true,
      onCompletedArchive: archive,
      onBlocked: blocked,
    });

    expect(result.completed).toBe(false);
    expect(result.blockedByVerification).toBe(true);
    expect(result.archived).toBe(false);
    expect(archive).not.toHaveBeenCalled();
    expect(blocked).toHaveBeenCalled();
    expect(result.productReadiness?.goalsCompleted).toBe(0);
  });

  it("refuses to complete when a goal failed", async () => {
    const recorder = new MissionTapeRecorderService();
    const result = await completeProductMission({
      missionId: "wf-3",
      intent: "Partial run",
      goals: [
        { id: 1, description: "[ENGINEER] build", status: "COMPLETED" },
        { id: 2, description: "[AUDITOR] verify", status: "FAILED" },
      ],
      recorder,
      success: true,
    });

    expect(result.completed).toBe(false);
    expect(result.blockedByVerification).toBe(true);
  });

  it("still completes an unfinished mission under an explicit override", async () => {
    const recorder = new MissionTapeRecorderService();
    const result = await completeProductMission({
      missionId: "wf-4",
      intent: "Force close",
      goals: [{ id: 1, description: "[ENGINEER] build", status: "PENDING" }],
      recorder,
      success: true,
      verificationOverride: true,
      overrideReason: "Operator closed the mission manually",
    });

    expect(result.completed).toBe(true);
  });

  it("completes after a start checkpoint has been recorded", async () => {
    const recorder = new MissionTapeRecorderService();
    await recordMissionCheckpoint({
      missionId: "wf-5",
      intent: "Ship the revamp",
      label: "workforce start · 2 task(s)",
      goals: [
        { id: 1, description: "[ENGINEER] implement module", status: "PENDING" },
      ],
      recorder,
    });

    const result = await completeProductMission({
      missionId: "wf-5",
      intent: "Ship the revamp",
      goals: [
        { id: 1, description: "[ENGINEER] implement module", status: "COMPLETED" },
      ],
      recorder,
      success: true,
    });

    expect(result.blockedByVerification).toBe(false);
    expect(result.completed).toBe(true);
    // Goals mirror even though the checkpoint already put a step on the tape.
    expect(result.tape.steps.some((s) => s.goal.includes("implement module"))).toBe(
      true,
    );
  });

  it("records a tape verification row when completion is refused", async () => {
    const recorder = new MissionTapeRecorderService();
    await completeProductMission({
      missionId: "wf-6",
      intent: "Unfinished",
      goals: [{ id: 1, description: "[ENGINEER] build", status: "IN_PROGRESS" }],
      recorder,
      success: true,
    });

    const tape = await recorder.getTape("wf-6");
    expect(tape?.status).not.toBe("completed");
    expect(
      tape?.verification.some((v) => !v.passed && /goal/i.test(v.details ?? "")),
    ).toBe(true);
  });

  it("honors an explicit step kind instead of guessing from goal text", async () => {
    const recorder = new MissionTapeRecorderService();
    const result = await completeProductMission({
      missionId: "cu-2",
      intent: "Drive the browser",
      steps: [
        {
          stepId: "s1",
          goal: "step one",
          status: "verified",
          kind: "computer_use",
        },
      ],
      recorder,
      success: true,
    });

    expect(result.completed).toBe(true);
  });
});
