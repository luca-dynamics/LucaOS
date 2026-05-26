import {
  ComputerUseMissionTapeExternalSinkResult,
  ComputerUseMissionTapeSink,
  ComputerUseMissionTapeSinkAdapterOptions,
  ComputerUseMissionTapeSinkAdapterSnapshot,
  ComputerUseMissionTapeSinkRecord,
  ComputerUseMissionTapeSinkSnapshot,
} from "./types";

const rejectedResult: ComputerUseMissionTapeExternalSinkResult = { ok: false, reason: "external sink disabled; explicit opt-in required" };

export class ComputerUseMissionTapeSinkAdapter implements ComputerUseMissionTapeSink {
  private readonly records: ComputerUseMissionTapeSinkRecord[] = [];
  private forwardedCount = 0;
  private acceptedCount = 0;
  private rejectedCount = 0;
  private failedCount = 0;
  private lastResult?: ComputerUseMissionTapeExternalSinkResult;

  constructor(private readonly options: ComputerUseMissionTapeSinkAdapterOptions) {}

  record(record: ComputerUseMissionTapeSinkRecord): ComputerUseMissionTapeSinkRecord {
    this.records.push(record);
    this.forwardedCount += 1;
    void this.forwardRecord(record);
    return record;
  }

  listRecords(missionId?: string): ComputerUseMissionTapeSinkRecord[] {
    if (!missionId) return [...this.records];
    return this.records.filter((record) => record.missionId === missionId);
  }

  getSnapshot(missionId?: string): ComputerUseMissionTapeSinkSnapshot {
    return { records: this.listRecords(missionId), metadata: { tapeSinkKind: "scaffold", storageWritesEnabled: false, missionTapeImported: false, systemApisCalled: false } };
  }

  getAdapterSnapshot(missionId?: string): ComputerUseMissionTapeSinkAdapterSnapshot {
    return {
      records: this.listRecords(missionId),
      forwardedCount: this.forwardedCount,
      acceptedCount: this.acceptedCount,
      rejectedCount: this.rejectedCount,
      failedCount: this.failedCount,
      lastResult: this.lastResult,
      externalSnapshot: this.options.externalSink.getSnapshot?.(missionId),
      metadata: {
        sinkKind: "external_adapter",
        storageWritesEnabled: this.options.storageWritesEnabled ?? false,
        missionTapeImported: this.options.missionTapeImported ?? false,
        systemApisCalled: false,
        requiresExplicitOptIn: true,
      },
    };
  }

  reset(): void {
    this.records.length = 0;
    this.forwardedCount = 0;
    this.acceptedCount = 0;
    this.rejectedCount = 0;
    this.failedCount = 0;
    this.lastResult = undefined;
    this.options.externalSink.reset?.();
  }

  private async forwardRecord(record: ComputerUseMissionTapeSinkRecord): Promise<void> {
    if (!this.options.enableExternalMissionTapeSink) {
      this.rejectedCount += 1;
      this.lastResult = rejectedResult;
      return;
    }
    try {
      const result = await this.options.externalSink.record(record);
      this.lastResult = result;
      if (result.ok) this.acceptedCount += 1;
      else this.rejectedCount += 1;
    } catch (error) {
      this.failedCount += 1;
      this.lastResult = { ok: false, reason: error instanceof Error ? error.message : "external sink failed" };
    }
  }
}
