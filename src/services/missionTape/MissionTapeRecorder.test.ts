import { describe, expect, it } from "vitest";
import { MissionTapeRecorderService } from "./MissionTapeRecorder";

describe("MissionTapeRecorderService scaffold", () => {
  it("create + append + finalize flow", async () => {
    const svc = new MissionTapeRecorderService();
    await svc.createTape("m1", "intent one");
    await svc.appendStep("m1", { stepId: "s1", goal: "do", status: "executed" });
    const finalized = await svc.finalizeTape("m1", { status: "completed" });
    expect(finalized.status).toBe("completed");
    expect(finalized.steps).toHaveLength(1);
  });

  it("guard decision recording", async () => {
    const svc = new MissionTapeRecorderService();
    await svc.createTape("m2", "intent two");
    await svc.appendGuardDecision("m2", { allowed: false, requiresApproval: true, reason: "danger" });
    const tape = await svc.getTape("m2");
    expect(tape?.guard).toHaveLength(1);
    expect(tape?.guard[0].requiresApproval).toBe(true);
  });

  it("verification recording", async () => {
    const svc = new MissionTapeRecorderService();
    await svc.createTape("m3", "intent three");
    await svc.appendVerification("m3", { stepId: "s1", passed: true, details: "ok" });
    const tape = await svc.getTape("m3");
    expect(tape?.verification[0].passed).toBe(true);
  });

  it("recovery recording", async () => {
    const svc = new MissionTapeRecorderService();
    await svc.createTape("m4", "intent four");
    await svc.appendRecovery("m4", { stepId: "s1", recovered: true, reason: "retry", details: "restored" });
    const tape = await svc.getTape("m4");
    expect(tape?.recovery[0].recovered).toBe(true);
  });

  it("list/get behavior", async () => {
    const svc = new MissionTapeRecorderService();
    await svc.createTape("m5", "intent five");
    await svc.createTape("m6", "intent six");
    await svc.finalizeTape("m6", { status: "failed" });

    const one = await svc.getTape("m5");
    const listAll = await svc.listTapes();
    const listFailed = await svc.listTapes({ status: "failed" });

    expect(one?.missionId).toBe("m5");
    expect(listAll.length).toBeGreaterThanOrEqual(2);
    expect(listFailed.map((x) => x.missionId)).toContain("m6");
  });
});
