import {
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

  toMissionTapeStepRecord(event: ComputerUseTapeEvent): ComputerUseMissionTapeStepRecord {
    const record: ComputerUseMissionTapeStepRecord = { ...event, eventType: "action_plan", metadata: { adapterKind: "scaffold", missionTapeImported: false } };
    this.stepRecords.push(record);
    return record;
  }

  toMissionTapeVerificationRecord(event: ComputerUseTapeEvent): ComputerUseMissionTapeVerificationRecord {
    const record: ComputerUseMissionTapeVerificationRecord = { ...event, eventType: "verification_result", metadata: { adapterKind: "scaffold", missionTapeImported: false } };
    this.verificationRecords.push(record);
    return record;
  }

  toMissionTapeRecoveryRecord(event: ComputerUseTapeEvent): ComputerUseMissionTapeRecoveryRecord {
    const record: ComputerUseMissionTapeRecoveryRecord = { ...event, eventType: "recovery_plan", metadata: { adapterKind: "scaffold", missionTapeImported: false } };
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
