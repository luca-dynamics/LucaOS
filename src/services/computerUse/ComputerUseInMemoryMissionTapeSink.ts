import { ComputerUseMissionTapeSink, ComputerUseMissionTapeSinkRecord, ComputerUseMissionTapeSinkSnapshot } from "./types";

export class ComputerUseInMemoryMissionTapeSink implements ComputerUseMissionTapeSink {
  private readonly records: ComputerUseMissionTapeSinkRecord[] = [];

  record(record: ComputerUseMissionTapeSinkRecord): ComputerUseMissionTapeSinkRecord {
    this.records.push(record);
    return record;
  }

  listRecords(missionId?: string): ComputerUseMissionTapeSinkRecord[] {
    if (!missionId) return [...this.records];
    return this.records.filter((record) => record.missionId === missionId);
  }

  getSnapshot(missionId?: string): ComputerUseMissionTapeSinkSnapshot {
    return {
      records: this.listRecords(missionId),
      metadata: {
        tapeSinkKind: "scaffold",
        storageWritesEnabled: false,
        missionTapeImported: false,
        systemApisCalled: false,
      },
    };
  }

  reset(): void {
    this.records.length = 0;
  }
}
