import { describe, expect, it, vi } from "vitest";
import { MissionEngine } from "./MissionEngine";
import { GuardHook, MissionRecoveryHandler, MissionTapeRecorder, MissionVerifier, MissionStep } from "./types";

const step: MissionStep = {
  stepId: "mission.step.001",
  goal: "Run sample",
  toolOrRuntime: "filesystem.write",
  expectedOutput: "ok",
  verification: "npm run type-check",
  rollback: "restore snapshot",
  riskLevel: "safe",
};

describe("MissionEngine scaffold", () => {
  it("creates and plans mission", () => {
    const engine = buildEngine();
    const mission = engine.createMission("Do task");
    expect(mission.status).toBe("queued");

    engine.planMission(mission, [step]);
    expect(mission.status).toBe("planned");
    expect(mission.steps).toHaveLength(1);
  });

  it("executes verifies and records tape", async () => {
    const recorder = { recordMissionTape: vi.fn(async () => {}) };
    const engine = buildEngine({ tapeRecorder: recorder });
    const mission = engine.planMission(engine.createMission("Do task"), [step]);

    const executed = await engine.executeStep(mission);
    expect(executed.success).toBe(true);

    const verified = await engine.verifyStep(mission);
    expect(verified.success).toBe(true);
    expect(mission.status).toBe("completed");

    const tape = await engine.recordMissionTape(mission, verified);
    expect(tape.result?.success).toBe(true);
    expect(recorder.recordMissionTape).toHaveBeenCalledTimes(1);
  });
});

function buildEngine(overrides?: {
  verifier?: MissionVerifier;
  recoveryHandler?: MissionRecoveryHandler;
  tapeRecorder?: MissionTapeRecorder;
  guardHook?: GuardHook;
}) {
  const verifier: MissionVerifier = overrides?.verifier ?? {
    verifyStep: async () => ({ passed: true, details: "pass" }),
  };
  const recoveryHandler: MissionRecoveryHandler = overrides?.recoveryHandler ?? {
    recoverStep: async () => ({ recovered: true, details: "restored" }),
  };
  const tapeRecorder: MissionTapeRecorder = overrides?.tapeRecorder ?? {
    recordMissionTape: async () => {},
  };
  const guardHook: GuardHook = overrides?.guardHook ?? {
    evaluateStepRisk: async () => ({ allowed: true, requiresApproval: false }),
  };

  return new MissionEngine(verifier, recoveryHandler, tapeRecorder, guardHook);
}
