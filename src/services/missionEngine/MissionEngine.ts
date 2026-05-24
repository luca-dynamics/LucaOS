import {
  GuardHook,
  Mission,
  MissionCheckpoint,
  MissionRecoveryHandler,
  MissionResult,
  MissionStep,
  MissionTape,
  MissionTapeRecorder,
  MissionVerifier,
} from "./types";

const nowIso = () => new Date().toISOString();

export class MissionEngine {
  constructor(
    private readonly verifier: MissionVerifier,
    private readonly recoveryHandler: MissionRecoveryHandler,
    private readonly tapeRecorder: MissionTapeRecorder,
    private readonly guardHook: GuardHook,
  ) {}

  createMission(intent: string): Mission {
    const ts = nowIso();
    return {
      missionId: `mission_${Date.now()}`,
      intent,
      status: "queued",
      createdAt: ts,
      updatedAt: ts,
      steps: [],
      currentStepIndex: 0,
      checkpoints: [],
    };
  }

  planMission(mission: Mission, steps: MissionStep[]): Mission {
    mission.steps = steps;
    mission.status = "planned";
    mission.updatedAt = nowIso();
    return mission;
  }

  async executeStep(mission: Mission): Promise<MissionResult> {
    const step = mission.steps[mission.currentStepIndex];
    if (!step) {
      return { success: false, status: "failed", missionId: mission.missionId, error: "No step to execute" };
    }

    const guard = await this.guardHook.evaluateStepRisk(mission, step);
    if (!guard.allowed) {
      mission.status = guard.requiresApproval ? "awaiting_approval" : "failed";
      return {
        success: false,
        status: mission.status,
        missionId: mission.missionId,
        error: guard.reason ?? "Guard denied step execution",
      };
    }

    mission.status = "executing";
    mission.updatedAt = nowIso();
    return { success: true, status: mission.status, missionId: mission.missionId, evidence: [step.stepId] };
  }

  async verifyStep(mission: Mission): Promise<MissionResult> {
    const step = mission.steps[mission.currentStepIndex];
    if (!step) return { success: false, status: "failed", missionId: mission.missionId, error: "No step to verify" };

    mission.status = "verifying";
    const verification = await this.verifier.verifyStep(mission, step);

    if (verification.passed) {
      mission.currentStepIndex += 1;
      mission.status = mission.currentStepIndex >= mission.steps.length ? "completed" : "planned";
      mission.updatedAt = nowIso();
      return { success: true, status: mission.status, missionId: mission.missionId, evidence: [verification.details ?? "verified"] };
    }

    mission.status = "failed";
    return { success: false, status: "failed", missionId: mission.missionId, error: verification.details ?? "Verification failed" };
  }

  createCheckpoint(mission: Mission, partial: Omit<MissionCheckpoint, "checkpointId" | "missionId" | "createdAt">): MissionCheckpoint {
    const cp: MissionCheckpoint = {
      checkpointId: `cp_${Date.now()}`,
      missionId: mission.missionId,
      createdAt: nowIso(),
      ...partial,
    };
    mission.checkpoints.push(cp);
    mission.updatedAt = nowIso();
    return cp;
  }

  async recoverStep(mission: Mission, reason: string): Promise<MissionResult> {
    const step = mission.steps[mission.currentStepIndex];
    if (!step) return { success: false, status: "failed", missionId: mission.missionId, error: "No step to recover" };

    const recovery = await this.recoveryHandler.recoverStep(mission, step, reason);
    mission.status = recovery.recovered ? "recovered" : "failed";
    mission.updatedAt = nowIso();

    return {
      success: recovery.recovered,
      status: mission.status,
      missionId: mission.missionId,
      evidence: recovery.details ? [recovery.details] : undefined,
      error: recovery.recovered ? undefined : recovery.details ?? reason,
    };
  }

  async recordMissionTape(mission: Mission, result: MissionResult): Promise<MissionTape> {
    const tape: MissionTape = {
      missionId: mission.missionId,
      intent: mission.intent,
      status: mission.status,
      startedAt: mission.createdAt,
      completedAt: nowIso(),
      steps: mission.steps.map((s, i) => ({
        stepId: s.stepId,
        goal: s.goal,
        status: i < mission.currentStepIndex ? "verified" : mission.status === "failed" ? "failed" : "executed",
      })),
      result,
    };
    await this.tapeRecorder.recordMissionTape(tape);
    return tape;
  }
}
