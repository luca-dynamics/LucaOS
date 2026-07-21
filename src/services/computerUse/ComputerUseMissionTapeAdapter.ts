import {
  ComputerUseMissionStepResult,
  ComputerUseMissionTapeRecoveryRecord,
  ComputerUseMissionTapeSnapshot,
  ComputerUseMissionTapeStepRecord,
  ComputerUseMissionTapeVerificationRecord,
  ComputerUseTapeEvent,
} from "./types";

export class ComputerUseMissionTapeAdapter {
  private readonly stepRecords: ComputerUseMissionTapeStepRecord[] = [];
  private readonly verificationRecords: ComputerUseMissionTapeVerificationRecord[] = [];
  private readonly recoveryRecords: ComputerUseMissionTapeRecoveryRecord[] = [];

  /** Runtime contract: record a mission step result onto the tape. */
  recordStepResult(result: ComputerUseMissionStepResult): ComputerUseMissionTapeStepRecord {
    return this.toMissionTapeStepRecord({
      missionId: result.missionId,
      timestamp: new Date().toISOString(),
      eventType: "action_plan",
      payload: {
        stepId: result.stepId,
        status: result.status,
        reason: result.reason,
        pipelineResult: result.pipelineResult,
      },
    });
  }

  /** Runtime contract: record a verification payload. */
  recordVerificationResult(
    missionId: string,
    payload: unknown,
  ): ComputerUseMissionTapeVerificationRecord {
    return this.toMissionTapeVerificationRecord({
      missionId,
      timestamp: new Date().toISOString(),
      eventType: "verification_result",
      payload,
    });
  }

  /** Runtime contract: record a recovery plan payload. */
  recordRecoveryPlan(
    missionId: string,
    payload: unknown,
  ): ComputerUseMissionTapeRecoveryRecord {
    return this.toMissionTapeRecoveryRecord({
      missionId,
      timestamp: new Date().toISOString(),
      eventType: "recovery_plan",
      payload,
    });
  }

  /** Runtime contract alias for createMissionTapeSnapshot. */
  getSnapshot(missionId: string): ComputerUseMissionTapeSnapshot {
    return this.createMissionTapeSnapshot(missionId);
  }

  toMissionTapeStepRecord(event: ComputerUseTapeEvent): ComputerUseMissionTapeStepRecord {
    if (event.eventType !== "action_plan") throw new Error("Expected action_plan event");

    const record: ComputerUseMissionTapeStepRecord = {
      ...event,
      eventType: "action_plan",
      metadata: { adapterKind: "scaffold", missionTapeImported: false },
    };
    this.stepRecords.push(record);
    return record;
  }

  toMissionTapeVerificationRecord(event: ComputerUseTapeEvent): ComputerUseMissionTapeVerificationRecord {
    if (event.eventType !== "verification_result") throw new Error("Expected verification_result event");

    const record: ComputerUseMissionTapeVerificationRecord = {
      ...event,
      eventType: "verification_result",
      metadata: { adapterKind: "scaffold", missionTapeImported: false },
    };
    this.verificationRecords.push(record);
    return record;
  }

  toMissionTapeRecoveryRecord(event: ComputerUseTapeEvent): ComputerUseMissionTapeRecoveryRecord {
    if (event.eventType !== "recovery_plan") throw new Error("Expected recovery_plan event");

    const record: ComputerUseMissionTapeRecoveryRecord = {
      ...event,
      eventType: "recovery_plan",
      metadata: { adapterKind: "scaffold", missionTapeImported: false },
    };
    this.recoveryRecords.push(record);
    return record;
  }

  createMissionTapeSnapshot(missionId: string): ComputerUseMissionTapeSnapshot {
    return {
      missionId,
      stepRecords: this.stepRecords.filter((x) => x.missionId === missionId),
      verificationRecords: this.verificationRecords.filter((x) => x.missionId === missionId),
      recoveryRecords: this.recoveryRecords.filter((x) => x.missionId === missionId),
      metadata: { adapterKind: "scaffold", missionTapeImported: false },
    };
  }

  reset(): void {
    this.stepRecords.length = 0;
    this.verificationRecords.length = 0;
    this.recoveryRecords.length = 0;
  }
}
